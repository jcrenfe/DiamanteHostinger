process.env.NO_LISTEN = '1';
process.env.JWT_SECRET = 'test-secret';
const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const src = (...p) => path.resolve(__dirname, '..', 'src', ...p);
const orders = [{ id: '123456789012', status: 'paid', customer_name: 'Ana', customer_email: 'ana@x.com', delivery_address: 'Calle Secreta 1' }];
require.cache[src('config', 'prisma.js')] = { id: 'p', filename: src('config', 'prisma.js'), loaded: true, children: [], paths: [],
    exports: { order: { findUnique: async ({ where }) => orders.find(o => o.id === where.id) || null, findMany: async () => orders } } };
const app = require(src('app.js'));
let server, base;
test.before(async () => { await new Promise(r => { server = app.listen(0, r); }); base = `http://127.0.0.1:${server.address().port}/api/orders`; });
test.after(() => server.close());

test('el estado de un pedido es público (sin sesión) y solo devuelve el estado, nunca datos personales', async () => {
    const res = await fetch(`${base}/123456789012/status`);
    assert.equal(res.status, 200);
    assert.deepEqual(await res.json(), { status: 'paid' });
});

test('un pedido inexistente da 404', async () => {
    assert.equal((await fetch(`${base}/000000000000/status`)).status, 404);
});

test('el detalle completo del pedido sigue exigiendo sesión', async () => {
    assert.equal((await fetch(`${base}/123456789012`)).status, 401);
});
