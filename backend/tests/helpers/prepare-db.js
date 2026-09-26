// Aplica a la base de pruebas las migraciones pendientes (se ejecuta antes de "npm test"). No borra nada:
// cada prueba vacía las tablas que usa con reset() de db.js. En una base vacía construye toda la estructura,
// así las pruebas comprueban también que las migraciones son correctas.
const { execSync } = require('node:child_process');
const path = require('node:path');
const { url, dbName } = require('./env');

console.log(`Preparando la base de pruebas "${dbName}" (${new URL(url).host})…`);
execSync('npx prisma migrate deploy', {
    cwd: path.resolve(__dirname, '..', '..'),
    env: { ...process.env, DATABASE_URL: url, PRISMA_HIDE_UPDATE_MESSAGE: '1' },
    stdio: ['ignore', 'ignore', 'inherit']
});
console.log('Base de pruebas lista.');
