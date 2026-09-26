// Traduce los errores de datos a respuestas HTTP coherentes en todas las rutas.
const { Prisma, isNotFound, isUniqueViolation } = require('../config/prisma');
const { InputError } = require('./input');

/**
 * 400 si los datos recibidos no son válidos, 404 si el registro no existe, 409 si repite un valor único
 * y 500 en cualquier otro caso (el detalle solo va al registro del servidor).
 */
function handleDbError(res, e, { notFound = 'No encontrado', conflict = 'Ya existe un registro con esos datos', fallback = 'Error del servidor' } = {}) {
    if (e instanceof InputError) return res.status(400).json({ error: e.message });
    if (isNotFound(e)) return res.status(404).json({ error: notFound });
    if (isUniqueViolation(e)) return res.status(409).json({ error: conflict });
    if (e instanceof Prisma.PrismaClientValidationError) return res.status(400).json({ error: 'Datos no válidos' });
    console.error(`❌ ${fallback}:`, e);
    return res.status(500).json({ error: fallback });
}

module.exports = { handleDbError };
