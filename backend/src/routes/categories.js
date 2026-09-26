const express = require('express');
const { prisma } = require('../config/prisma');
const { verifyToken, isAdmin } = require('../middleware/auth');
const { pick, CATEGORY_FIELDS } = require('../utils/input');
const { handleDbError } = require('../utils/dbErrors');
const router = express.Router();

// GET /api/categories - Obtener categorías
router.get('/', async (req, res) => {
    try {
        const categories = await prisma.category.findMany();
        res.json(categories);
    } catch (e) {
        handleDbError(res, e, { fallback: 'Error al obtener categorías' });
    }
});

// POST /api/categories - Crear categoría (Admin). El id lo propone el panel; si no llega, se genera.
router.post('/', verifyToken, isAdmin, async (req, res) => {
    try {
        const data = pick(req.body, CATEGORY_FIELDS);
        if (typeof req.body?.id === 'string' && req.body.id) data.id = req.body.id;
        const category = await prisma.category.create({ data });
        res.json(category);
    } catch (e) {
        handleDbError(res, e, { conflict: 'Ya existe una categoría con ese identificador', fallback: 'Error al crear categoría' });
    }
});

// PUT /api/categories/:id - Actualizar categoría (Admin)
router.put('/:id', verifyToken, isAdmin, async (req, res) => {
    try {
        const category = await prisma.category.update({
            where: { id: req.params.id },
            data: pick(req.body, CATEGORY_FIELDS)
        });
        res.json(category);
    } catch (e) {
        handleDbError(res, e, { notFound: 'Categoría no encontrada', fallback: 'Error al actualizar categoría' });
    }
});

// DELETE /api/categories/:id - Eliminar categoría (Admin)
router.delete('/:id', verifyToken, isAdmin, async (req, res) => {
    try {
        await prisma.category.delete({ where: { id: req.params.id } });
        res.json({ message: 'Categoría eliminada correctamente' });
    } catch (e) {
        handleDbError(res, e, { notFound: 'Categoría no encontrada', fallback: 'Error al eliminar categoría' });
    }
});

module.exports = router;
