const express = require('express');
const router = express.Router();
const { prisma } = require('../config/prisma');
const { verifyToken, isAdmin } = require('../middleware/auth');

// Configuración de disponibilidad (días, franjas, reglas de bloqueo, origen y recargos)
router.get('/appointment', async (req, res) => {
    try {
        const configDoc = await prisma.configuration.findUnique({ where: { id: 'disponibilidad' } });
        if (configDoc && configDoc.value) {
            res.json(configDoc.value);
        } else {
            res.status(404).json({ error: 'Configuración no encontrada' });
        }
    } catch (error) {
        console.error('Error fetching appointment config:', error);
        res.status(500).json({ error: 'Error del servidor' });
    }
});

// Guarda la configuración de disponibilidad (Admin)
router.post('/appointment', verifyToken, isAdmin, async (req, res) => {
    const value = req.body;
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
        return res.status(400).json({ error: 'Configuración no válida' });
    }
    try {
        const updatedConfig = await prisma.configuration.upsert({
            where: { id: 'disponibilidad' },
            update: { value },
            create: { id: 'disponibilidad', value }
        });
        res.json({ success: true, config: updatedConfig.value });
    } catch (error) {
        console.error('Error saving appointment config:', error);
        res.status(500).json({ error: 'Error del servidor' });
    }
});

module.exports = router;
