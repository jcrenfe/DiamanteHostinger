const jwt = require('jsonwebtoken');

const { JWT_SECRET } = require('../config/jwt');

const verifyToken = (req, res, next) => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'No autorizado. Se requiere token Bearer.' });
    }

    const token = authHeader.split(' ')[1];

    try {
        const decodedToken = jwt.verify(token, JWT_SECRET);
        req.user = decodedToken; // Contiene { uid, email, role }
        next();
    } catch (error) {
        console.error('Error verificando token:', error.message);
        res.status(401).json({ error: 'Token inválido o expirado.' });
    }
};

const isAdmin = (req, res, next) => {
    if (req.user && req.user.role === 'admin') {
        next();
    } else {
        res.status(403).json({ error: 'Acceso denegado. Se requiere rol de administrador.' });
    }
};

module.exports = { verifyToken, isAdmin };

