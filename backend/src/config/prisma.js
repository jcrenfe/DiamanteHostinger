// Acceso a la base de datos: cliente de Prisma 7 con el adaptador MariaDB, que sirve tanto para el
// MySQL local como para el MariaDB de producción. Toda la aplicación usa este único cliente.
const { PrismaClient, Prisma } = require('@prisma/client');
const { PrismaMariaDb } = require('@prisma/adapter-mariadb');

/** Opciones de conexión del adaptador a partir de una URL mysql://usuario:clave@host:puerto/base */
function connectionOptions(databaseUrl, extra = {}) {
    if (!databaseUrl) throw new Error('Falta la variable de entorno DATABASE_URL.');
    const u = new URL(databaseUrl);
    return {
        host: u.hostname,
        port: Number(u.port || 3306),
        user: decodeURIComponent(u.username),
        password: decodeURIComponent(u.password),
        database: u.pathname.slice(1),
        connectionLimit: Number(process.env.DB_POOL_SIZE || 5),
        // MySQL 8 (local) autentica con caching_sha2_password y necesita la clave pública del servidor.
        allowPublicKeyRetrieval: true,
        ...extra
    };
}

const prisma = new PrismaClient({ adapter: new PrismaMariaDb(connectionOptions(process.env.DATABASE_URL)) });

/**
 * Ejecuta fn(tx) dentro de una transacción que tiene en exclusiva el bloqueo `name` (p. ej. "slot:2026-10-03").
 * Sirve para que dos clientes no reserven a la vez horas que se solapan, también entre varias instancias
 * del servidor. El bloqueo es la fila `name` de la tabla SlotLock: INSERT ... ON DUPLICATE KEY UPDATE la
 * bloquea en exclusiva (la crea si no existe) y la base de datos la libera sola al terminar la transacción,
 * tanto si se confirma como si falla. Todas las consultas de la sección crítica deben hacerse con `tx`.
 */
async function withLock(name, fn, { timeoutMs = 20000 } = {}) {
    return prisma.$transaction(async (tx) => {
        await tx.$executeRaw`INSERT INTO \`SlotLock\` (\`name\`) VALUES (${name}) ON DUPLICATE KEY UPDATE \`name\` = \`name\``;
        return fn(tx);
    }, {
        // Read Committed: tras obtener el bloqueo, cada lectura ve lo que confirmó quien lo tenía antes.
        isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted,
        maxWait: 10000,
        timeout: timeoutMs
    });
}

/** Error de Prisma "registro no encontrado" (update/delete sobre un id que no existe). */
const isNotFound = (e) => e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2025';
/** Error de Prisma "valor único repetido" (p. ej. un email ya registrado). */
const isUniqueViolation = (e) => e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002';

module.exports = { prisma, Prisma, withLock, isNotFound, isUniqueViolation, connectionOptions };
