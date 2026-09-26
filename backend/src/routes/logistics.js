const express = require('express');
const router = express.Router();
require('dotenv').config();
const { prisma } = require('../config/prisma');
const { verifyToken, isAdmin } = require('../middleware/auth');
const { checkDeliveryDistance } = require('../services/deliveryDistance');
const { computeMatrix, MAX_STOPS } = require('../services/routeMatrix');
const { planRoute } = require('../services/routePlanner');

const GOOGLE_MAPS_KEY = process.env.GOOGLE_MAPS_API_KEY;
const INACTIVE_STATUSES = ['cancelled', 'refunded', 'paid_conflict', 'failed'];

/**
 * Comprueba si una dirección de entrega existe y está dentro del radio de reparto
 * configurado en el panel de administración (Disponibilidad > Origen y Proximidad).
 * Pública: la usa el checkout para dar feedback en vivo antes de confirmar el pedido.
 */
router.post('/check-delivery', async (req, res) => {
    const { address, city, zip } = req.body || {};
    if (!address || !city || !zip) {
        return res.status(400).json({ valid: false, reason: 'missing_fields' });
    }
    try {
        const result = await checkDeliveryDistance({ address, city, zip });
        res.json(result);
    } catch (error) {
        console.error('Error en /logistics/check-delivery:', error.response?.data || error.message);
        // Sin verificar la dirección no se acepta el pedido
        res.json({ valid: false, checked: false, reason: 'check_unavailable' });
    }
});

/**
 * Ruta recomendada para UN repartidor con los pedidos que el administrador elige.
 * Usa la matriz de tiempos de la Routes API y respeta la franja de entrega de cada pedido.
 * Origen: la dirección configurada en el panel de disponibilidad.
 */
router.post('/optimize', verifyToken, isAdmin, async (req, res) => {
    const { date, orderIds, marginMinutes } = req.body || {};
    const ids = Array.isArray(orderIds) ? [...new Set(orderIds.map(String))] : [];
    if (!date || !ids.length) {
        return res.status(400).json({ success: false, message: 'Elige al menos un pedido.' });
    }
    if (ids.length > MAX_STOPS) {
        return res.status(400).json({ success: false, message: `Puedes elegir como máximo ${MAX_STOPS} pedidos por ruta.` });
    }
    if (!GOOGLE_MAPS_KEY) {
        return res.status(503).json({ success: false, message: 'Google Maps no está configurado en el servidor.' });
    }
    try {
        const configDoc = await prisma.configuration.findUnique({ where: { id: 'disponibilidad' } });
        const originAddress = configDoc?.value?.originAddress;
        if (!originAddress) {
            return res.status(400).json({ success: false, message: 'Configura la dirección de origen en el panel de disponibilidad.' });
        }

        const dayOrders = await prisma.order.findMany({ where: { delivery_date: date } });
        const byId = new Map(dayOrders.map(o => [String(o.id), o]));
        const chosen = [];
        for (const id of ids) {
            const o = byId.get(id);
            if (!o) return res.status(400).json({ success: false, message: `El pedido ${id} no es de la fecha ${date}.` });
            if (INACTIVE_STATUSES.includes(o.status)) {
                return res.status(400).json({ success: false, message: `El pedido ${id} está ${o.status} y no puede entrar en una ruta.` });
            }
            chosen.push(o);
        }

        const addresses = [originAddress, ...chosen.map(o => `${o.delivery_address}, ${o.delivery_zip} ${o.delivery_city}, España`)];
        const { durations, distances } = await computeMatrix(addresses);
        const margin = Math.min(60, Math.max(0, parseInt(marginMinutes, 10) || 0));
        const plan = planRoute({
            stops: chosen.map(o => ({ id: String(o.id), timeSlot: o.delivery_timeSlot })),
            durations, distances, serviceMin: margin
        });

        const info = new Map(chosen.map(o => [String(o.id), o]));
        res.json({
            success: true,
            origin: originAddress,
            ...plan,
            stops: plan.stops.map(s => {
                const o = info.get(s.id);
                return {
                    ...s,
                    customer_name: o.customer_name,
                    customer_phone: o.customer_phone,
                    address: `${o.delivery_address}, ${o.delivery_city} (${o.delivery_zip})`,
                    addressExtra: o.delivery_addressExtra || null,
                    status: o.status
                };
            })
        });
    } catch (error) {
        console.error('Error calculando la ruta de reparto:', error.response?.data || error.message);
        if (error.code === 'no_route') {
            return res.status(422).json({ success: false, message: error.message });
        }
        res.status(502).json({ success: false, message: 'Google Maps no ha podido calcular la ruta. Inténtalo de nuevo.' });
    }
});

module.exports = router;
