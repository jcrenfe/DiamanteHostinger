const express = require('express');
const prisma = require('../config/prisma');
const { verifyToken, isAdmin } = require('../middleware/auth');
const router = express.Router();

// GET /api/orders - Obtener todos los pedidos (admin) o los del usuario
router.get('/', verifyToken, async (req, res) => {
    try {
        const isAdminUser = req.user.role === 'admin';
        const where = isAdminUser ? {} : { customer_uid: req.user.uid };
        
        const orders = await prisma.order.findMany({
            where,
            orderBy: { createdAt: 'desc' }
        });
        res.json(orders);
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

// POST /api/orders - Crear un nuevo pedido
router.post('/', async (req, res) => {
    try {
        const data = req.body;
        
        // Crear pedido en la base de datos
        const order = await prisma.order.create({
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
                total: data.total,
                status: data.status || 'pending',
            }
        });
        
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
