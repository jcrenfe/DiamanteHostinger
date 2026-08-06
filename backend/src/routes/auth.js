const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const prisma = require('../config/prisma');
const router = express.Router();

const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_jwt_key_diamante';

router.post('/login', async (req, res) => {
    const { email, password } = req.body;
    
    if (!email || !password) {
        return res.status(400).json({ error: 'Email y contraseña son obligatorios' });
    }

    try {
        const user = await prisma.user.findUnique({ where: { email } });
        if (!user) {
            return res.status(401).json({ error: 'Credenciales inválidas' });
        }

        // Si tenemos usuarios migrados de Firebase sin contraseña (login social/Google)
        if (!user.password) {
            return res.status(401).json({ error: 'Este usuario inició sesión con Google. Por favor, usa Google Login.' });
        }

        const isValid = await bcrypt.compare(password, user.password);
        if (!isValid) {
            return res.status(401).json({ error: 'Credenciales inválidas' });
        }

        const token = jwt.sign(
            { uid: user.uid, email: user.email, role: user.role },
            JWT_SECRET,
            { expiresIn: '7d' }
        );

        res.json({
            token,
            user: { uid: user.uid, email: user.email, displayName: user.displayName, role: user.role }
        });
    } catch (e) {
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

router.post('/register', async (req, res) => {
    const { email, password, displayName } = req.body;

    if (!email || !password) {
        return res.status(400).json({ error: 'Email y contraseña son obligatorios' });
    }

    try {
        const existing = await prisma.user.findUnique({ where: { email } });
        if (existing) {
            return res.status(400).json({ error: 'El email ya está registrado' });
        }

        const passwordHash = await bcrypt.hash(password, 10);
        // Generar un UUID simple para simular el UID de Firebase
        const uid = require('crypto').randomUUID();

        const user = await prisma.user.create({
            data: { uid, email, displayName, password: passwordHash, role: 'cliente' }
        });

        const token = jwt.sign(
            { uid: user.uid, email: user.email, role: user.role },
            JWT_SECRET,
            { expiresIn: '7d' }
        );

        res.json({
            token,
            user: { uid: user.uid, email: user.email, displayName: user.displayName, role: user.role }
        });
    } catch (e) {
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

// POST /api/auth/google - Autenticación con Google
router.post('/google', async (req, res) => {
    const { email, displayName, uid } = req.body;

    if (!email) {
        return res.status(400).json({ error: 'Email es obligatorio' });
    }

    try {
        let user = await prisma.user.findUnique({ where: { email } });
        if (!user) {
            user = await prisma.user.create({
                data: {
                    uid: uid || require('crypto').randomUUID(),
                    email,
                    displayName: displayName || email.split('@')[0],
                    role: 'cliente'
                }
            });
        }

        const token = jwt.sign(
            { uid: user.uid, email: user.email, role: user.role },
            JWT_SECRET,
            { expiresIn: '7d' }
        );

        res.json({
            token,
            user: { uid: user.uid, email: user.email, displayName: user.displayName, role: user.role }
        });
    } catch (e) {
        console.error('Error en Google Auth backend:', e);
        res.status(500).json({ error: 'Error al autenticar con Google' });
    }
});

module.exports = router;
