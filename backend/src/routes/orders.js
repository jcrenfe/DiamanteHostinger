const express = require('express');
const prisma = require('../config/prisma');
const { verifyToken, isAdmin } = require('../middleware/auth');
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
        const orders = await prisma.order.findMany({});
        res.json(orders
            .filter(o => isActiveBooking(o) && o.delivery_date && o.delivery_timeSlot && inRange(o, req.query))
            .map(o => ({ date: o.delivery_date, timeSlot: o.delivery_timeSlot, proximity: o.delivery_proximity || null })));
    } catch (e) {
        res.status(500).json({ error: 'Error al obtener la ocupación' });
    }
});

// GET /api/orders - Obtener todos los pedidos (admin) o los del usuario. Admite ?date=, ?start=&end=
router.get('/', verifyToken, async (req, res) => {
    try {
        const isAdminUser = req.user.role === 'admin';
        const where = isAdminUser ? {} : { customer_uid: req.user.uid };

        const orders = await prisma.order.findMany({
            where,
            orderBy: { createdAt: 'desc' }
        });
        res.json(orders.filter(o => inRange(o, req.query)));
    } catch (e) {
        res.status(500).json({ error: 'Error al obtener pedidos' });
    }
});

// GET /api/orders/:id - Obtener un pedido específico
router.get('/:id', verifyToken, async (req, res) => {
    try {
        const order = await prisma.order.findUnique({
            where: { id: req.params.id }
        });
        
        if (!order) {
            return res.status(404).json({ error: 'Pedido no encontrado' });
        }
        
        if (req.user.role !== 'admin' && order.customer_uid !== req.user.uid) {
            return res.status(403).json({ error: 'Acceso denegado' });
        }
        
        res.json(order);
    } catch (e) {
        res.status(500).json({ error: 'Error al obtener el pedido' });
    }
});

const { sendOrderConfirmationEmail } = require('../services/emailService');
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
                    ? 'No hemos podido localizar la dirección indicada.'
                    : 'Lo sentimos, tu dirección está fuera de nuestro radio de reparto.',
                reason: distanceCheck.reason,
                durationMinutes: distanceCheck.durationMinutes,
                distanceKm: distanceCheck.distanceKm,
                maxDeliveryMinutes: distanceCheck.maxDeliveryMinutes
            });
        }

        // El incremento por desplazamiento (Media/Lejos) se calcula en servidor y se
        // suma al subtotal recibido del cliente para obtener el total real a cobrar.
        const surchargeAmount = distanceCheck.surchargeAmount || 0;
        const subtotal = parseFloat(data.total) || 0;
        const finalTotal = Math.round((subtotal + surchargeAmount) * 100) / 100;

        // Validar la hora y crear el pedido de forma atómica: el bloqueo por fecha serializa a los
        // clientes que reservan el mismo día, así dos pedidos no pueden coger la misma hora.
        const slotDate = data.delivery?.date;
        const result = await prisma.$withLock(`slot:${slotDate}`, 10, async () => {
            const configDoc = await prisma.configuration.findUnique({ where: { id: 'disponibilidad' } });
            const existing = await prisma.order.findMany({});
            const slotError = validateSlot({
                config: configDoc?.value,
                orders: existing.filter(o => !data.id || o.id !== data.id),
                dateStr: slotDate,
                timeSlot: data.delivery?.timeSlot
            });
            if (slotError) return { slotError };

            // Crear pedido en la base de datos
            const created = await prisma.order.create({
                data: {
                    id: data.id,
                    customer_uid: data.customer?.uid,
                    customer_name: data.customer?.name,
                    customer_email: data.customer?.email,
                    customer_phone: data.customer?.phone,
                    delivery_address: data.delivery?.address,
                    delivery_city: data.delivery?.city,
                    delivery_zip: data.delivery?.zip,
                    delivery_date: data.delivery?.date,
                    delivery_timeSlot: data.delivery?.timeSlot,
                    delivery_message: data.delivery?.message,
                    delivery_distanceKm: distanceCheck.distanceKm ?? null,
                    delivery_durationMin: distanceCheck.durationMinutes ?? null,
                    delivery_proximity: distanceCheck.proximity ?? null,
                    delivery_surchargeAmount: surchargeAmount,
                    total: finalTotal,
                    status: data.status || 'pending',
                }
            });
            return { order: created };
        });

        if (result.slotError) {
            return res.status(result.slotError.status).json({ error: result.slotError.error, reason: 'slot_unavailable' });
        }
        const order = result.order;

        // Enviar correo de confirmación de forma asíncrona
        sendOrderConfirmationEmail({ ...order, items: data.items }, order.id || data.redsysOrderId).catch(err => {
            console.error('Error enviando email de confirmación:', err);
        });

        res.json(order);
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Error al crear el pedido' });
    }
});

// PUT /api/orders/:id/status - Actualizar estado del pedido (admin)
router.put('/:id/status', verifyToken, isAdmin, async (req, res) => {
    try {
        const { status } = req.body;
        const order = await prisma.order.update({
            where: { id: req.params.id },
            data: { status }
        });
        res.json(order);
    } catch (e) {
        res.status(500).json({ error: 'Error al actualizar el estado' });
    }
});

module.exports = router;
