// Entorno de las pruebas. Se requiere ANTES que cualquier módulo de src/.
// - La base de datos es siempre una base "*_test" (nunca la de desarrollo): TEST_DATABASE_URL o, si no se
//   indica, la de .env con el nombre de base cambiado a "diamante_test".
// - Claves y secretos ficticios; los servicios externos (Google, Stripe, correo) se simulan en stubs.js.
const path = require('node:path');

require('dotenv').config({ path: path.resolve(__dirname, '..', '..', '.env'), quiet: true });

function testDatabaseUrl() {
    if (process.env.TEST_DATABASE_URL) return process.env.TEST_DATABASE_URL;
    const u = new URL(process.env.DATABASE_URL);
    u.pathname = '/diamante_test';
    return u.toString();
}

const url = testDatabaseUrl();
const dbName = new URL(url).pathname.slice(1);
if (!dbName.endsWith('_test')) {
    throw new Error(`Las pruebas solo se ejecutan contra una base "*_test" (recibida: "${dbName}").`);
}

process.env.DATABASE_URL = url;
process.env.NODE_ENV = 'test';
process.env.NO_LISTEN = '1';
process.env.JWT_SECRET = 'test-secret';
process.env.GOOGLE_MAPS_API_KEY = 'test-key';
process.env.STRIPE_SECRET_KEY = 'sk_test_dummy';
process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test_secret_for_unit_tests';
process.env.SMTP_USER = 'pruebas@example.com';
process.env.ALLOWED_ORIGINS = 'http://localhost:4500';

module.exports = { url, dbName };
