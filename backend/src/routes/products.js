const express = require('express');
const prisma = require('../config/prisma');
const { verifyToken, isAdmin } = require('../middleware/auth');
const router = express.Router();

// GET /api/products - Obtener todos los productos
router.get('/', async (req, res) => {
    try {
        const products = await prisma.product.findMany();
        res.json(products);
    } catch (e) {
        console.error('Error GET /api/products:', e);
        res.status(500).json({ error: 'Error al obtener productos', details: e.message || String(e) });
    }
});

// GET /api/products/:id - Obtener un producto específico
router.get('/:id', async (req, res) => {
    try {
        const product = await prisma.product.findUnique({
            where: { id: req.params.id }
        });
        if (!product) return res.status(404).json({ error: 'Producto no encontrado' });
        res.json(product);
    } catch (e) {
        res.status(500).json({ error: 'Error al obtener producto' });
    }
});

// POST /api/products - Crear un nuevo producto (Admin)
router.post('/', verifyToken, isAdmin, async (req, res) => {
    try {
        const data = req.body;
        const product = await prisma.product.create({ data });
        res.json(product);
    } catch (e) {
        res.status(500).json({ error: 'Error al crear producto' });
    }
});

// PUT /api/products/:id - Actualizar un producto (Admin)
router.put('/:id', verifyToken, isAdmin, async (req, res) => {
    try {
        const data = req.body;
        const product = await prisma.product.update({
            where: { id: req.params.id },
            data
        });
        res.json(product);
    } catch (e) {
        res.status(500).json({ error: 'Error al actualizar producto' });
    }
});

// DELETE /api/products/:id - Eliminar un producto (Admin)
router.delete('/:id', verifyToken, isAdmin, async (req, res) => {
    try {
        await prisma.product.delete({
            where: { id: req.params.id }
        });
        res.json({ message: 'Producto eliminado correctamente' });
    } catch (e) {
        res.status(500).json({ error: 'Error al eliminar producto' });
    }
});

module.exports = router;
