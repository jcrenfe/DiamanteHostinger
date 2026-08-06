const express = require('express');
const prisma = require('../config/prisma');
const { verifyToken, isAdmin } = require('../middleware/auth');
const router = express.Router();

// GET /api/offers - Obtener ofertas
router.get('/', async (req, res) => {
    try {
        const { active } = req.query;
        let where = {};
        if (active === 'true') {
            where.active = true;
        }
        const offers = await prisma.offer.findMany({ where });
        res.json(offers);
    } catch (e) {
        res.status(500).json({ error: 'Error al obtener ofertas' });
    }
});

// POST /api/offers - Crear oferta (Admin)
router.post('/', verifyToken, isAdmin, async (req, res) => {
    try {
        const data = req.body;
        const offer = await prisma.offer.create({ data });
        res.json(offer);
    } catch (e) {
        res.status(500).json({ error: 'Error al crear oferta' });
    }
});

// PUT /api/offers/:id - Actualizar oferta (Admin)
router.put('/:id', verifyToken, isAdmin, async (req, res) => {
    try {
        const data = req.body;
        const offer = await prisma.offer.update({
            where: { id: req.params.id },
            data
        });
        res.json(offer);
    } catch (e) {
        res.status(500).json({ error: 'Error al actualizar oferta' });
    }
});

// DELETE /api/offers/:id - Eliminar oferta (Admin)
router.delete('/:id', verifyToken, isAdmin, async (req, res) => {
    try {
        await prisma.offer.delete({
            where: { id: req.params.id }
        });
        res.json({ message: 'Oferta eliminada correctamente' });
    } catch (e) {
        res.status(500).json({ error: 'Error al eliminar oferta' });
    }
});

module.exports = router;
