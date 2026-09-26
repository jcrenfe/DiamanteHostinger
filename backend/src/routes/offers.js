const express = require('express');
const { prisma } = require('../config/prisma');
const { verifyToken, isAdmin } = require('../middleware/auth');
const { pick, OFFER_FIELDS } = require('../utils/input');
const { handleDbError } = require('../utils/dbErrors');
const router = express.Router();

// GET /api/offers - Obtener ofertas (?active=true: solo las activas)
router.get('/', async (req, res) => {
    try {
        const where = req.query.active === 'true' ? { active: true } : {};
        const offers = await prisma.offer.findMany({ where });
        res.json(offers);
    } catch (e) {
        handleDbError(res, e, { fallback: 'Error al obtener ofertas' });
    }
});

// POST /api/offers - Crear oferta (Admin)
router.post('/', verifyToken, isAdmin, async (req, res) => {
    try {
        const offer = await prisma.offer.create({ data: pick(req.body, OFFER_FIELDS) });
        res.json(offer);
    } catch (e) {
        handleDbError(res, e, { fallback: 'Error al crear oferta' });
    }
});

// PUT /api/offers/:id - Actualizar oferta (Admin)
router.put('/:id', verifyToken, isAdmin, async (req, res) => {
    try {
        const offer = await prisma.offer.update({
            where: { id: req.params.id },
            data: pick(req.body, OFFER_FIELDS)
        });
        res.json(offer);
    } catch (e) {
        handleDbError(res, e, { notFound: 'Oferta no encontrada', fallback: 'Error al actualizar oferta' });
    }
});

// DELETE /api/offers/:id - Eliminar oferta (Admin)
router.delete('/:id', verifyToken, isAdmin, async (req, res) => {
    try {
        await prisma.offer.delete({ where: { id: req.params.id } });
        res.json({ message: 'Oferta eliminada correctamente' });
    } catch (e) {
        handleDbError(res, e, { notFound: 'Oferta no encontrada', fallback: 'Error al eliminar oferta' });
    }
});

module.exports = router;
