const prisma = require('../config/prisma');
const { blockedMinutes, hasPaidConflict, isActiveBooking, toMin, PAYMENT_STARTING } = require('./availability');
const { sendSlotConflictRefundEmail } = require('./emailService');

const findOrder = async (orderId) =>
    (await prisma.order.findFirst({ where: { redsysOrderId: String(orderId) } })) ||
    (await prisma.order.findUnique({ where: { id: String(orderId) } }));

const getConfig = async () => (await prisma.configuration.findUnique({ where: { id: 'disponibilidad' } }))?.value;

/**
 * C) Antes de crear la sesión de pago: comprueba que la hora sigue libre y arranca la retención
 * ampliada (PAYMENT_HOLD_MINUTES), para que quien ya está pagando no pierda su hora.
 * Devuelve { ok: true, order } (order = null si el pedido no existe) o { ok: false, status, reason, error }.
 */
async function beginPayment(orderId) {
    const found = await findOrder(orderId);
    if (!found) return { ok: true, order: null };

    return prisma.$withLock(`slot:${found.delivery_date}`, 10, async () => {
        const order = await findOrder(orderId);
        if (order.status === 'paid') return { ok: false, status: 409, reason: 'already_paid', error: 'Este pedido ya está pagado.' };
        if (['cancelled', 'refunded', 'paid_conflict'].includes(order.status)) {
            return { ok: false, status: 409, reason: 'order_closed', error: 'Este pedido ya no está activo.' };
        }
        const config = await getConfig();
        const others = (await prisma.order.findMany({})).filter(o =>
            o.id !== order.id && o.delivery_date === order.delivery_date && isActiveBooking(o));
        if (blockedMinutes(others, config).has(toMin(order.delivery_timeSlot))) {
            return { ok: false, status: 409, reason: 'slot_unavailable', error: 'La hora de entrega elegida ya no está disponible. Elige otra.' };
        }
        await prisma.order.update({
            where: { id: order.id },
            data: { stripeSessionId: PAYMENT_STARTING, updatedAt: new Date() }
        });
        return { ok: true, order };
    });
}

async function attachSession(order, sessionId) {
    await prisma.order.update({ where: { id: order.id }, data: { stripeSessionId: sessionId, updatedAt: new Date() } });
}

async function releasePaymentHold(order) {
    await prisma.order.update({ where: { id: order.id }, data: { stripeSessionId: null, updatedAt: new Date() } });
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

    const outcome = await prisma.$withLock(`slot:${first.delivery_date}`, 10, async () => {
        const order = await findOrder(orderId);
        if (['paid', 'refunded', 'paid_conflict'].includes(order.status)) return { result: 'ignored' };

        const config = await getConfig();
        const orders = await prisma.order.findMany({});
        if (!hasPaidConflict({ config, orders, order })) {
            await prisma.order.update({
                where: { id: order.id },
                data: { status: 'paid', stripeSessionId: session.id, stripePaymentIntent: session.payment_intent, updatedAt: new Date() }
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
            await prisma.order.update({ where: { id: order.id }, data: { status: 'paid_conflict', stripeSessionId: session.id, updatedAt: new Date() } });
            return { result: 'refund_failed', order };
        }
        await prisma.order.update({ where: { id: order.id }, data: { status: 'refunded', stripeSessionId: session.id, updatedAt: new Date() } });
        return { result: 'refunded', order };
    });

    if (outcome.result === 'refunded' || outcome.result === 'refund_failed') {
        sendSlotConflictRefundEmail(outcome.order, outcome.result === 'refunded').catch(() => {});
    }
    return outcome;
}

module.exports = { beginPayment, attachSession, releasePaymentHold, confirmStripePayment };
