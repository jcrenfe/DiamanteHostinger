const admin = require('firebase-admin');

/**
 * Middleware to verify Firebase ID Token
 */
const verifyToken = async (req, res, next) => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'No autorizado. Se requiere token Bearer.' });
    }

    const token = authHeader.split(' ')[1];

    try {
        const decodedToken = await admin.auth().verifyIdToken(token);
        req.user = decodedToken;
        next();
    } catch (error) {
        console.error('Error verificando token:', error.message);
        res.status(401).json({ error: 'Token inválido o expirado.' });
    }
};

/**
 * Middleware to check for Admin role
 */
const isAdmin = (req, res, next) => {
    if (req.user && req.user.role === 'admin') {
        next();
    } else {
        // In Firebase Auth, we usually set Custom Claims for roles
        // If not using Custom Claims yet, we'd check against a DB here
        // For now, let's assume we use Custom Claims in the backend later
        if (req.user && req.user.admin === true) {
            next();
        } else {
            res.status(403).json({ error: 'Acceso denegado. Se requiere rol de administrador.' });
        }
    }
};

module.exports = { verifyToken, isAdmin };
