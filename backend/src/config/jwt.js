// Secreto con el que se firman las sesiones (JWT). En producción es obligatorio definirlo por entorno:
// un valor por defecto público permitiría a cualquiera fabricar un token de administrador.
const secret = process.env.JWT_SECRET;

if (!secret && process.env.NODE_ENV === 'production') {
    throw new Error('Falta la variable de entorno JWT_SECRET (obligatoria en producción).');
}

if (!secret) {
    console.warn('⚠️ JWT_SECRET no definido: usando un secreto de desarrollo. No usar en producción.');
}

module.exports = { JWT_SECRET: secret || 'dev-only-insecure-jwt-secret' };
