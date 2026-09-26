// Configuración del CLI de Prisma 7 (generate, migrate). La URL solo hace falta para migrar.
require('dotenv').config();
const { defineConfig } = require('prisma/config');

module.exports = defineConfig({
    schema: 'prisma/schema.prisma',
    migrations: { path: 'prisma/migrations' },
    datasource: { url: process.env.DATABASE_URL || '' }
});
