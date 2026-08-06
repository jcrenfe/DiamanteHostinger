const express = require('express');
const router = express.Router();
const prisma = require('../config/prisma');

// Get the appointment configuration
router.get('/appointment', async (req, res) => {
    try {
        const configDoc = await prisma.configuration.findUnique({
            where: { id: 'disponibilidad' }
        });
        
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

// Update the appointment configuration
router.post('/appointment', async (req, res) => {
    try {
        const updatedConfig = await prisma.configuration.upsert({
            where: { id: 'disponibilidad' },
            update: { value: req.body },
            create: { id: 'disponibilidad', value: req.body }
        });
        res.json({ success: true, config: updatedConfig.value });
    } catch (error) {
        console.error('Error saving appointment config:', error);
        res.status(500).json({ error: 'Error del servidor' });
    }
});

module.exports = router;
