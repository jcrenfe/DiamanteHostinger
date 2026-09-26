const express = require('express');
const { prisma, withLock } = require('../config/prisma');
const { handleDbError } = require('../utils/dbErrors');
const { isValidPaymentToken } = require('../services/paymentLink');
const { verifyToken, isAdmin, optionalUser } = require('../middleware/auth');
const router = express.Router();

const inRange = (o, { date, start, end }) => {
    const d = o.delivery_date;
    if (date && d !== date) return false;
    if (start && !(d >= start)) return false;
    if (end && !(d <= end)) return false;
    return true;
};

// GET /api/orders/occupancy?date=|start=&end= - Horas ocupadas (pública, sin datos personales).
// La usa el checkout para no ofrecer horas ya reservadas, también a clientes sin sesión.
router.get('/occupancy', async (req, res) => {
    try {
        const orders = await prisma.order.findMany({
            select: { delivery_date: true, delivery_timeSlot: true, delivery_proximity: true, status: true, stripeSessionId: true, createdAt: true, updatedAt: true }
        });
        res.json(orders
            .filter(o => isActiveBooking(o) && o.delivery_date && o.delivery_timeSlot && inRange(o, req.query))
            .map(o => ({ date: o.delivery_date, timeSlot: o.delivery_timeSlot, proximity: o.delivery_proximity || null })));
    } catch (e) {
        res.status(500).json({ error: 'Error al obtener la ocupación' });
    }
});

// GET /api/orders - Pedidos con sus líneas. Admin: todos; cliente: los suyos.
// Admite ?date=, ?start=&end= y ?mine=1 (solo los propios, también para un administrador: "Mis pedidos").
router.get('/', verifyToken, async (req, res) => {
    try {
        const wantsMine = req.query.mine === '1' || req.query.mine === 'true';
        const seeAll = req.user.role === 'admin' && !wantsMine;
        // Sin uid no hay pedidos propios que mostrar (y un filtro vacío devolvería los de todos)
        if (!seeAll && !req.user.uid) return res.json([]);
        const where = seeAll ? {} : { customer_uid: req.user.uid };

        const orders = await prisma.order.findMany({
            where,
            orderBy: { createdAt: 'desc' },
            include: { items: { orderBy: { id: 'asc' } } }
        });
        res.json(orders.filter(o => inRange(o, req.query)));
    } catch (e) {
        handleDbError(res, e, { fallback: 'Error al obtener pedidos' });
    }
});

// GET /api/orders/:id/status - Estado de un pedido (pública, solo devuelve el estado, sin datos personales).
// La usa el checkout, también para clientes sin sesión, para saber si el pago se ha completado o cancelado.
router.get('/:id/status', async (req, res) => {
    try {
        const order = await prisma.order.findUnique({ where: { id: req.params.id }, select: { status: true } });
        if (!order) return res.status(404).json({ error: 'Pedido no encontrado' });
        res.json({ status: order.status });
    } catch (e) {
        handleDbError(res, e, { fallback: 'Error al obtener el estado del pedido' });
    }
});

// GET /api/orders/:id/payment?t=firma - Datos de un pedido pendiente para pagarlo desde el enlace del correo.
// Sin sesión, pero exige la firma del enlace; solo devuelve lo necesario para revisar el pedido antes de pagar.
router.get('/:id/payment', async (req, res) => {
    try {
        if (!isValidPaymentToken(req.params.id, req.query.t)) {
            return res.status(403).json({ error: 'El enlace de pago no es válido.' });
        }
        const order = await prisma.order.findUnique({
            where: { id: req.params.id },
            include: { items: { orderBy: { id: 'asc' }, select: { name: true, price: true, quantity: true } } }
        });
        if (!order) return res.status(404).json({ error: 'Pedido no encontrado' });
        if (['paid', 'delivered'].includes(order.status)) return res.json({ id: order.id, status: 'paid' });
        if (!['pending', 'failed'].includes(order.status)) return res.json({ id: order.id, status: 'closed' });
        res.json({
            id: order.id,
            status: 'payable',
            total: order.total,
            surchargeAmount: order.delivery_surchargeAmount || 0,
            items: order.items,
            customer: { name: order.customer_name, email: order.customer_email, phone: order.customer_phone },
            delivery: {
                address: order.delivery_address, city: order.delivery_city, zip: order.delivery_zip,
                addressExtra: order.delivery_addressExtra, date: order.delivery_date, timeSlot: order.delivery_timeSlot
            }
        });
    } catch (e) {
        handleDbError(res, e, { fallback: 'Error al obtener el pedido' });
    }
});

// GET /api/orders/:id - Obtener un pedido específico
router.get('/:id', verifyToken, async (req, res) => {
    try {
        const order = await prisma.order.findUnique({
            where: { id: req.params.id },
            include: { items: { orderBy: { id: 'asc' } } }
        });

        if (!order) {
            return res.status(404).json({ error: 'Pedido no encontrado' });
        }
        
        if (req.user.role !== 'admin' && order.customer_uid !== req.user.uid) {
            return res.status(403).json({ error: 'Acceso denegado' });
        }
        
        res.json(order);
    } catch (e) {
        handleDbError(res, e, { fallback: 'Error al obtener el pedido' });
    }
});

const { checkDeliveryDistance } = require('../services/deliveryDistance');
const { validateSlot, isActiveBooking } = require('../services/availability');

// POST /api/orders - Crear un nuevo pedido
router.post('/', async (req, res) => {
    try {
        const data = req.body;

        // Verificación autoritativa en servidor: aunque el checkout ya avisa al cliente,
        // no confiamos en distancia/duración enviadas desde el navegador.
        const distanceCheck = await checkDeliveryDistance({
            address: data.delivery?.address,
            city: data.delivery?.city,
            zip: data.delivery?.zip
        });

        if (!distanceCheck.valid) {
            return res.status(422).json({
                error: distanceCheck.reason === 'address_not_found'
                    ? 'No hemos podido localizar la dirección indicada. Revisa que la calle, el número, la ciudad y el código postal sean correctos.'
                    : distanceCheck.reason === 'check_unavailable'
                        ? 'No hemos podido verificar tu dirección en este momento. Inténtalo de nuevo en unos minutos.'
                        : 'Lo sentimos, tu dirección está fuera de nuestro radio de reparto.',
                reason: distanceCheck.reason,
                durationMinutes: distanceCheck.durationMinutes,
                distanceKm: distanceCheck.distanceKm,
                maxDeliveryMinutes: distanceCheck.maxDeliveryMinutes
            });
        }

        // Dirección de entrega que se guarda: la normalizada por Google (la que se comunica al cliente).
        // Si Google la ha corregido se conserva también lo que escribió el cliente.
        const norm = distanceCheck.normalizedAddress || {};
        const deliveryAddress = norm.address || data.delivery?.address;
        const deliveryCity = norm.city || data.delivery?.city;
        const deliveryZip = norm.zip || data.delivery?.zip;
        const originalAddress = distanceCheck.addressCorrected
            ? [data.delivery?.address, data.delivery?.zip, data.delivery?.city].filter(Boolean).join(', ')
            : null;

        // El incremento por desplazamiento (Media/Lejos) se calcula en servidor y se
        // suma al subtotal recibido del cliente para obtener el total real a cobrar.
        const surchargeAmount = distanceCheck.surchargeAmount || 0;
        const subtotal = parseFloat(data.total) || 0;
        const finalTotal = Math.round((subtotal + surchargeAmount) * 100) / 100;

        // Validar la hora y crear el pedido de forma atómica: el bloqueo por fecha serializa a los
        // clientes que reservan el mismo día, así dos pedidos no pueden coger la misma hora.
        const slotDate = data.delivery?.date;
        // El pedido y sus líneas se guardan en la misma transacción: o se guarda todo o nada.
        const lines = (Array.isArray(data.items) ? data.items : []).map(it => ({
            productId: it.product?.id ?? it.productId ?? null,
            name: String(it.product?.name ?? it.name ?? 'Producto').slice(0, 190),
            price: Number(it.product?.price ?? it.price) || 0,
            quantity: parseInt(it.quantity, 10) || 1
        }));
        const text = (v) => (v === undefined || v === null ? v : String(v));
        const result = await withLock(`slot:${slotDate}`, async (tx) => {
            const configDoc = await tx.configuration.findUnique({ where: { id: 'disponibilidad' } });
            // validateSlot solo tiene en cuenta los pedidos del mismo día
            const existing = await tx.order.findMany({ where: { delivery_date: String(slotDate ?? '') } });
            const slotError = validateSlot({
                config: configDoc?.value,
                orders: existing.filter(o => !data.id || o.id !== String(data.id)),
                dateStr: slotDate,
                timeSlot: data.delivery?.timeSlot
            });
            if (slotError) return { slotError };

            // Crear pedido en la base de datos
            const created = await tx.order.create({
                data: {
                    ...(data.id ? { id: String(data.id) } : {}),
                    customer_uid: optionalUser(req)?.uid ?? null,
                    customer_name: text(data.customer?.name),
                    customer_email: text(data.customer?.email),
                    customer_phone: text(data.customer?.phone),
                    delivery_address: deliveryAddress,
                    delivery_city: deliveryCity,
                    delivery_zip: deliveryZip,
                    delivery_addressOriginal: originalAddress,
                    delivery_addressExtra: String(data.delivery?.addressExtra || '').trim().slice(0, 190) || null,
                    delivery_date: text(data.delivery?.date),
                    delivery_timeSlot: text(data.delivery?.timeSlot),
                    delivery_message: text(data.delivery?.message),
                    delivery_distanceKm: distanceCheck.distanceKm ?? null,
                    delivery_durationMin: distanceCheck.durationMinutes ?? null,
                    delivery_proximity: distanceCheck.proximity ?? null,
                    delivery_surchargeAmount: surchargeAmount,
                    total: finalTotal,
                    // Un pedido nuevo siempre está pendiente: solo el aviso de pago de Stripe lo marca como pagado
                    status: 'pending',
                    // Líneas del pedido (para "Mis pedidos", el panel de administración y los correos)
                    items: { create: lines }
                }
            });
            return { order: created };
        });

        if (result.slotError) {
            return res.status(result.slotError.status).json({ error: result.slotError.error, reason: 'slot_unavailable' });
        }
        const order = result.order;

        // El correo de confirmación se envía cuando Stripe confirma el pago (services/paymentFlow.js)
        res.json(order);
    } catch (e) {
        handleDbError(res, e, { conflict: 'Ya existe un pedido con ese número', fallback: 'Error al crear el pedido' });
    }
});

const ORDER_STATUSES = ['pending', 'paid', 'delivered', 'cancelled', 'failed', 'refunded', 'paid_conflict'];

// PUT /api/orders/:id/status - Actualizar estado del pedido (admin)
router.put('/:id/status', verifyToken, isAdmin, async (req, res) => {
    try {
        const { status } = req.body || {};
        if (!ORDER_STATUSES.includes(status)) {
            return res.status(400).json({ error: `Estado no válido. Valores posibles: ${ORDER_STATUSES.join(', ')}` });
        }
        const order = await prisma.order.update({
            where: { id: req.params.id },
            data: { status }
        });
        res.json(order);
    } catch (e) {
        handleDbError(res, e, { notFound: 'Pedido no encontrado', fallback: 'Error al actualizar el estado' });
    }
});

module.exports = router;
