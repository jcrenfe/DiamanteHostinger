// Estado público de un pedido (base de datos real de pruebas).
require('./helpers/env');
const { src } = require('./helpers/stubs');
const db = require('./helpers/db');
const test = require('node:test');
const assert = require('node:assert/strict');

const app = require(src('app.js'));
let server, base;
test.before(async () => {
    await new Promise(r => { server = app.listen(0, r); });
    base = `http://127.0.0.1:${server.address().port}/api/orders`;
    await db.reset();
    await db.insertOrders([{ id: '123456789012', status: 'paid', customer_name: 'Ana', customer_email: 'ana@x.com', delivery_address: 'Calle Secreta 1' }]);
});
test.after(async () => { server.close(); await db.client.$disconnect(); });

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
