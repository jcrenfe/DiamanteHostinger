process.env.NO_LISTEN = '1';
process.env.JWT_SECRET = 'test-secret';
const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const src = (...p) => path.resolve(__dirname, '..', 'src', ...p);
const rows = [
    { id: 'a', name: 'A', local_image_path: 'http://localhost:3500/uploads/1.webp' },
    { id: 'b', name: 'B', local_image_path: '/uploads/2.webp' },
    { id: 'c', name: 'C', local_image_path: 'https://api.thewayweb.com/uploads/3.webp' },
    { id: 'd', name: 'D', local_image_path: null }
];
require.cache[src('config', 'prisma.js')] = { id: 'p', filename: src('config', 'prisma.js'), loaded: true, children: [], paths: [],
    exports: { product: { findMany: async () => rows.map(r => ({ ...r })), findUnique: async ({ where }) => rows.find(r => r.id === where.id) || null } } };
const app = require(src('app.js'));
let server, base;
test.before(async () => { await new Promise(r => { server = app.listen(0, r); }); base = `http://127.0.0.1:${server.address().port}/api/products`; });
test.after(() => server.close());

test('las rutas de imagen absolutas de desarrollo (localhost) se devuelven relativas; el resto no cambia', async () => {
    const list = await (await fetch(base)).json();
    assert.deepEqual(list.map(p => p.local_image_path), ['/uploads/1.webp', '/uploads/2.webp', 'https://api.thewayweb.com/uploads/3.webp', null]);
});

test('el detalle de un producto también normaliza la ruta', async () => {
    const p = await (await fetch(`${base}/a`)).json();
    assert.equal(p.local_image_path, '/uploads/1.webp');
});
