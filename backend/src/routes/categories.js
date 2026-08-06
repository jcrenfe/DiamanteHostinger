const express = require('express');
const prisma = require('../config/prisma');
const { verifyToken, isAdmin } = require('../middleware/auth');
const router = express.Router();

// GET /api/categories - Obtener categorías
router.get('/', async (req, res) => {
    try {
        const categories = await prisma.category.findMany();
        res.json(categories);
    } catch (e) {
        res.status(500).json({ error: 'Error al obtener categorías' });
    }
});

// POST /api/categories - Crear categoría (Admin)
router.post('/', verifyToken, isAdmin, async (req, res) => {
    try {
        const data = req.body;
        const category = await prisma.category.create({ data });
        res.json(category);
    } catch (e) {
        console.error('Error in POST /categories:', e);
        res.status(500).json({ error: 'Error al crear categoría' });
    }
});

// PUT /api/categories/:id - Actualizar categoría (Admin)
router.put('/:id', verifyToken, isAdmin, async (req, res) => {
    try {
        const data = req.body;
        const category = await prisma.category.update({
            where: { id: req.params.id },
            data
        });
        res.json(category);
    } catch (e) {
        res.status(500).json({ error: 'Error al actualizar categoría' });
    }
});

// DELETE /api/categories/:id - Eliminar categoría (Admin)
router.delete('/:id', verifyToken, isAdmin, async (req, res) => {
    try {
        await prisma.category.delete({
            where: { id: req.params.id }
        });
        res.json({ message: 'Categoría eliminada correctamente' });
    } catch (e) {
        res.status(500).json({ error: 'Error al eliminar categoría' });
    }
});

module.exports = router;
