const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('node:crypto');
const { prisma, isUniqueViolation } = require('../config/prisma');
const router = express.Router();

const { JWT_SECRET } = require('../config/jwt');
const { verifyFirebaseIdToken } = require('../services/googleIdToken');

router.post('/login', async (req, res) => {
    const { email, password } = req.body || {};

    if (typeof email !== 'string' || typeof password !== 'string' || !email || !password) {
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
        console.error('Error en /auth/login:', e);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

router.post('/register', async (req, res) => {
    const { email, password, displayName } = req.body || {};

    if (typeof email !== 'string' || typeof password !== 'string' || !email || !password) {
        return res.status(400).json({ error: 'Email y contraseña son obligatorios' });
    }

    try {
        const existing = await prisma.user.findUnique({ where: { email } });
        if (existing) {
            return res.status(400).json({ error: 'El email ya está registrado' });
        }

        const passwordHash = await bcrypt.hash(password, 10);
        // Identificador propio del usuario (equivalente al UID de Firebase de los usuarios de Google)
        const uid = crypto.randomUUID();

        const user = await prisma.user.create({
            data: { uid, email, displayName: typeof displayName === 'string' ? displayName : null, password: passwordHash, role: 'cliente' }
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
        // Dos registros simultáneos con el mismo email: la restricción única de la base decide
        if (isUniqueViolation(e)) return res.status(400).json({ error: 'El email ya está registrado' });
        console.error('Error en /auth/register:', e);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

// POST /api/auth/google - Autenticación con Google
// El navegador envía el ID token de Firebase; la identidad (email/uid) se toma SIEMPRE del token
// verificado en el servidor, nunca de campos enviados por el cliente.
router.post('/google', async (req, res) => {
    let identity;
    try {
        identity = await verifyFirebaseIdToken(req.body?.idToken);
    } catch (e) {
        return res.status(401).json({ error: 'No se pudo verificar la identidad de Google.' });
    }
    const { email, displayName, uid } = identity;

    try {
        let user = await prisma.user.findUnique({ where: { email } });
        if (!user) {
            user = await prisma.user.create({
                data: { uid, email, displayName, role: 'cliente' }
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
