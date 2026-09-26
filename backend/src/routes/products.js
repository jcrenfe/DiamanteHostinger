const express = require('express');
const crypto = require('node:crypto');
const { prisma } = require('../config/prisma');
const { verifyToken, isAdmin } = require('../middleware/auth');
const { pick, PRODUCT_FIELDS } = require('../utils/input');
const { handleDbError } = require('../utils/dbErrors');
const router = express.Router();

// Rutas absolutas de desarrollo (http://localhost:3500/uploads/x.webp) -> relativas (/uploads/x.webp),
// para que las imágenes se vean desde cualquier entorno.
const relativeImage = (p) => (typeof p === 'string' ? p.replace(/^https?:\/\/localhost(:\d+)?/, '') : p);
const cleanProduct = (prod) => (prod ? { ...prod, local_image_path: relativeImage(prod.local_image_path) } : prod);

// GET /api/products - Obtener todos los productos
router.get('/', async (req, res) => {
    try {
        const products = await prisma.product.findMany();
        res.json(products.map(cleanProduct));
    } catch (e) {
        handleDbError(res, e, { fallback: 'Error al obtener productos' });
    }
});

// GET /api/products/:id - Obtener un producto específico
router.get('/:id', async (req, res) => {
    try {
        const product = await prisma.product.findUnique({ where: { id: req.params.id } });
        if (!product) return res.status(404).json({ error: 'Producto no encontrado' });
        res.json(cleanProduct(product));
    } catch (e) {
        handleDbError(res, e, { fallback: 'Error al obtener producto' });
    }
});

// POST /api/products - Crear un nuevo producto (Admin). El id lo propone el panel; si no llega, se genera.
router.post('/', verifyToken, isAdmin, async (req, res) => {
    try {
        const data = pick(req.body, PRODUCT_FIELDS);
        data.id = typeof req.body?.id === 'string' && req.body.id ? req.body.id : crypto.randomUUID();
        const product = await prisma.product.create({ data });
        res.json(product);
    } catch (e) {
        handleDbError(res, e, { conflict: 'Ya existe un producto con ese identificador', fallback: 'Error al crear producto' });
    }
});

// PUT /api/products/:id - Actualizar un producto (Admin)
router.put('/:id', verifyToken, isAdmin, async (req, res) => {
    try {
        const product = await prisma.product.update({
            where: { id: req.params.id },
            data: pick(req.body, PRODUCT_FIELDS)
        });
        res.json(product);
    } catch (e) {
        handleDbError(res, e, { notFound: 'Producto no encontrado', fallback: 'Error al actualizar producto' });
    }
});

// DELETE /api/products/:id - Eliminar un producto (Admin)
router.delete('/:id', verifyToken, isAdmin, async (req, res) => {
    try {
        await prisma.product.delete({ where: { id: req.params.id } });
        res.json({ message: 'Producto eliminado correctamente' });
    } catch (e) {
        handleDbError(res, e, { notFound: 'Producto no encontrado', fallback: 'Error al eliminar producto' });
    }
});

module.exports = router;
