const { prisma, withLock } = require('../config/prisma');
const { blockedMinutes, hasPaidConflict, isActiveBooking, toMin, PAYMENT_STARTING } = require('./availability');
const { sendSlotConflictRefundEmail, sendOrderConfirmationEmail, sendPaymentProblemEmail } = require('./emailService');
const { paymentUrl } = require('./paymentLink');

// El pedido se identifica por su número público (redsysOrderId) o por su id. `db` es el cliente o la transacción.
const findOrder = async (orderId, db = prisma) =>
    (await db.order.findUnique({ where: { redsysOrderId: String(orderId) } })) ||
    (await db.order.findUnique({ where: { id: String(orderId) } }));

const getConfig = async (db) => (await db.configuration.findUnique({ where: { id: 'disponibilidad' } }))?.value;

// Pedidos que ya no admiten un pago: pagados o entregados, y cerrados
const CLOSED_STATUSES = ['cancelled', 'refunded', 'paid_conflict'];

/**
 * C) Antes de crear la sesión de pago: comprueba que la hora sigue libre y arranca la retención
 * ampliada (PAYMENT_HOLD_MINUTES), para que quien ya está pagando no pierda su hora.
 * Devuelve { ok: true, order } (order = null si el pedido no existe) o { ok: false, status, reason, error }.
 */
async function beginPayment(orderId) {
    const found = await findOrder(orderId);
    if (!found) return { ok: true, order: null };

    return withLock(`slot:${found.delivery_date}`, async (tx) => {
        const order = await findOrder(orderId, tx);
        if (order.status === 'paid' || order.status === 'delivered') {
            return { ok: false, status: 409, reason: 'already_paid', error: 'Este pedido ya está pagado.' };
        }
        if (CLOSED_STATUSES.includes(order.status)) {
            return { ok: false, status: 409, reason: 'order_closed', error: 'Este pedido ya no está activo.' };
        }
        const config = await getConfig(tx);
        const others = (await tx.order.findMany({ where: { delivery_date: order.delivery_date } }))
            .filter(o => o.id !== order.id && isActiveBooking(o));
        if (blockedMinutes(others, config).has(toMin(order.delivery_timeSlot))) {
            return { ok: false, status: 409, reason: 'slot_unavailable', error: 'La hora de entrega elegida ya no está disponible. Elige otra.' };
        }
        // updatedAt (@updatedAt) se renueva solo: marca el inicio de la retención ampliada del pago
        await tx.order.update({ where: { id: order.id }, data: { stripeSessionId: PAYMENT_STARTING } });
        return { ok: true, order };
    });
}

async function attachSession(order, sessionId) {
    await prisma.order.update({ where: { id: order.id }, data: { stripeSessionId: sessionId } });
}

async function releasePaymentHold(order) {
    await prisma.order.update({ where: { id: order.id }, data: { stripeSessionId: null } });
}

/**
 * A) Al confirmarse un pago en Stripe: vuelve a comprobar (bajo el bloqueo del día) que la hora no
 * la ha consumido otro pedido ya pagado. Si sigue libre, el pedido pasa a 'paid'; si no, se reembolsa
 * automáticamente, el pedido queda 'refunded' y se avisa al cliente por email.
 */
async function confirmStripePayment({ stripe, session }) {
    const orderId = session.metadata?.orderId;
    if (!orderId) return { result: 'ignored' };
    const first = await findOrder(orderId);
    if (!first) return { result: 'ignored' };

    const outcome = await withLock(`slot:${first.delivery_date}`, async (tx) => {
        const order = await findOrder(orderId, tx);
        // Stripe puede repetir el aviso: un pedido ya resuelto (o entregado) no se vuelve a procesar
        if (['paid', 'delivered', 'refunded', 'paid_conflict'].includes(order.status)) return { result: 'ignored' };

        const config = await getConfig(tx);
        const orders = await tx.order.findMany({ where: { delivery_date: order.delivery_date } });
        if (!hasPaidConflict({ config, orders, order })) {
            await tx.order.update({
                where: { id: order.id },
                data: { status: 'paid', stripeSessionId: session.id, stripePaymentIntent: session.payment_intent ?? null }
            });
            return { result: 'paid', order };
        }

        try {
            await stripe.refunds.create(
                { payment_intent: session.payment_intent },
                { idempotencyKey: `slot-conflict-${session.id}` }
            );
        } catch (err) {
            console.error(`❌ Reembolso automático fallido del pedido ${order.id} (conflicto de horario). REVISAR A MANO:`, err.message);
            await tx.order.update({ where: { id: order.id }, data: { status: 'paid_conflict', stripeSessionId: session.id } });
            return { result: 'refund_failed', order };
        }
        await tx.order.update({ where: { id: order.id }, data: { status: 'refunded', stripeSessionId: session.id } });
        return { result: 'refunded', order };
    });

    if (outcome.result === 'paid') {
        // El correo de confirmación solo se envía con el pago confirmado por Stripe (una vez: los avisos
        // repetidos llegan con el pedido ya pagado y se ignoran arriba).
        sendConfirmation(outcome.order.id).catch((e) => console.error('❌ Correo de confirmación:', e.message));
    }
    if (outcome.result === 'refunded' || outcome.result === 'refund_failed') {
        sendSlotConflictRefundEmail(outcome.order, outcome.result === 'refunded').catch(() => {});
    }
    return outcome;
}

async function sendConfirmation(orderId) {
    const order = await prisma.order.findUnique({ where: { id: orderId }, include: { items: { orderBy: { id: 'asc' } } } });
    if (order) await sendOrderConfirmationEmail(order);
}

/**
 * Avisa al cliente de que el pago no se ha completado, con un enlace para pagar el mismo pedido.
 * Se envía una sola vez por pedido: la marca paymentIssueEmailAt se reclama de forma atómica,
 * así dos avisos simultáneos de Stripe no generan dos correos.
 */
async function notifyPaymentProblem(orderId) {
    const claimed = await prisma.order.updateMany({
        where: { id: orderId, paymentIssueEmailAt: null, status: { in: ['pending', 'failed'] } },
        data: { paymentIssueEmailAt: new Date() }
    });
    if (claimed.count !== 1) return false;
    const order = await prisma.order.findUnique({ where: { id: orderId }, include: { items: { orderBy: { id: 'asc' } } } });
    return sendPaymentProblemEmail(order, paymentUrl(order.id));
}

/**
 * Pago fallido en Stripe (tarjeta rechazada…): el pedido queda pendiente de pago ('failed', nunca se
 * cancela solo) y se cuenta el intento. No se avisa todavía: el cliente puede corregir la tarjeta en la
 * misma pasarela; si la sesión termina sin pagarse, el aviso sale con handleSessionExpired.
 * No toca pedidos pagados, entregados ni cerrados.
 */
async function registerFailedPayment(orderId) {
    const order = await findOrder(orderId);
    if (!order || order.status === 'paid' || order.status === 'delivered' || CLOSED_STATUSES.includes(order.status)) return null;
    return prisma.order.update({
        where: { id: order.id },
        data: { failedPaymentAttempts: { increment: 1 }, status: 'failed' }
    });
}

/**
 * La sesión de pago de Stripe ha caducado sin pagarse (PAYMENT_HOLD_MINUTES después de abrirse):
 * se libera la retención y se avisa al cliente (una vez) con el enlace para pagar el mismo pedido.
 * Si el pedido tiene ya otra sesión de pago más reciente, la caducidad de la antigua no hace nada.
 */
async function handleSessionExpired(session) {
    const orderId = session.metadata?.orderId;
    if (!orderId) return { result: 'ignored' };
    const order = await findOrder(orderId);
    if (!order || !['pending', 'failed'].includes(order.status)) return { result: 'ignored' };
    if (order.stripeSessionId && order.stripeSessionId !== session.id) return { result: 'ignored' };
    if (order.stripeSessionId) await releasePaymentHold(order);
    const notified = await notifyPaymentProblem(order.id);
    return { result: notified ? 'notified' : 'already_notified' };
}

module.exports = { beginPayment, attachSession, releasePaymentHold, confirmStripePayment, registerFailedPayment, handleSessionExpired, notifyPaymentProblem, findOrder };
