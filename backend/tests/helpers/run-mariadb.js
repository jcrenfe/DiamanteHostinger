// "npm run test:mariadb": la misma batería contra el contenedor MariaDB 11.8 (el motor de producción).
// Contenedor: docker run -d --name diamante_mariadb_test -e MARIADB_ROOT_PASSWORD=test -e MARIADB_DATABASE=diamante_test -p 3308:3306 mariadb:11.8
const { execSync } = require('node:child_process');
const path = require('node:path');

const env = { ...process.env, TEST_DATABASE_URL: process.env.TEST_DATABASE_URL || 'mysql://root:test@localhost:3308/diamante_test' };
const opts = { cwd: path.resolve(__dirname, '..', '..'), env, stdio: 'inherit' };
execSync('node tests/helpers/prepare-db.js', opts);
execSync('node --test --test-concurrency=1 --test-force-exit tests/', opts);
