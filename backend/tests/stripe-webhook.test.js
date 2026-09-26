// Webhook de Stripe con FIRMA REAL sobre la aplicación completa (src/app.js) y base de datos real de pruebas:
// comprueba que el cuerpo llega sin procesar y la firma se verifica igual que en producción.
require('./helpers/env');
const { src, signWebhook, resetStubs } = require('./helpers/stubs');
const db = require('./helpers/db');

const test = require('node:test');
const assert = require('node:assert/strict');

const app = require(src('app.js'));

let server; let base;
test.before(async () => { await new Promise(r => { server = app.listen(0, r); }); base = `http://127.0.0.1:${server.address().port}`; });
test.after(async () => { server.close(); await db.client.$disconnect(); });
test.beforeEach(async () => {
    resetStubs();
    await db.reset();
    await db.setConfig({ deliveryDays: ['2099-03-03'], dailySlots: { 2: [{ start: '09:00', end: '13:00' }] } });
    await db.insertOrders([{
        id: 'ord1', redsysOrderId: '111222333', status: 'pending', customer_email: 'a@a.com', customer_name: 'Ana',
        delivery_date: '2099-03-03', delivery_timeSlot: '10:00'
    }]);
});
const ord1 = () => db.order('ord1');

const eventBody = () => JSON.stringify({
    id: 'evt_1', object: 'event', type: 'checkout.session.completed',
    data: { object: { id: 'cs_test_1', object: 'checkout.session', payment_intent: 'pi_test_1', metadata: { orderId: '111222333' } } }
});
const sign = signWebhook;
const post = (payload, headers) => fetch(`${base}/api/payment/stripe-webhook`, { method: 'POST', headers: { 'Content-Type': 'application/json', ...headers }, body: payload });

test('un aviso de pago con firma válida se acepta y el pedido pasa a paid', async () => {
    const payload = eventBody();
    const res = await post(payload, { 'stripe-signature': sign(payload) });
    assert.equal(res.status, 200);
    const o = await ord1();
    assert.equal(o.status, 'paid');
    assert.equal(o.stripePaymentIntent, 'pi_test_1');
});

test('un aviso con firma inválida se rechaza (400) y el pedido no cambia', async () => {
    const payload = eventBody();
    const res = await post(payload, { 'stripe-signature': 't=1,v1=firmafalsa' });
    assert.equal(res.status, 400);
    assert.equal((await ord1()).status, 'pending');
});

test('un aviso alterado después de firmarse se rechaza', async () => {
    const payload = eventBody();
    const header = sign(payload);
    const tampered = payload.replace('111222333', '999999999');
    const res = await post(tampered, { 'stripe-signature': header });
    assert.equal(res.status, 400);
    assert.equal((await ord1()).status, 'pending');
});

test('un aviso sin cabecera de firma se rechaza', async () => {
    const res = await post(eventBody(), {});
    assert.equal(res.status, 400);
    assert.equal((await ord1()).status, 'pending');
});

test('el resto de rutas siguen recibiendo JSON normal (login con datos incompletos → 400 de la propia ruta)', async () => {
    const res = await fetch(`${base}/api/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({}) });
    assert.equal(res.status, 400);
    assert.match((await res.json()).error, /obligatorios/);
});

test('en producción sin secreto real de webhook (o con el texto de ejemplo) se rechaza todo aviso, aunque no lleve firma', async () => {
    const prev = { env: process.env.NODE_ENV, secret: process.env.STRIPE_WEBHOOK_SECRET };
    try {
        process.env.NODE_ENV = 'production';
        for (const secret of [undefined, 'whsec_REEMPLAZAR_POR_TU_WEBHOOK_SECRET']) {
            if (secret === undefined) delete process.env.STRIPE_WEBHOOK_SECRET; else process.env.STRIPE_WEBHOOK_SECRET = secret;
            const res = await post(eventBody(), {});
            assert.equal(res.status, 500);
            assert.equal((await ord1()).status, 'pending');
        }
    } finally {
        process.env.NODE_ENV = prev.env;
        process.env.STRIPE_WEBHOOK_SECRET = prev.secret;
    }
});

test('un aviso de pago fallido cuenta el intento y el pedido queda pendiente de pago (nunca se cancela solo)', async () => {
    const failed = () => JSON.stringify({ id: 'evt_f', object: 'event', type: 'payment_intent.payment_failed', data: { object: { id: 'pi_f', object: 'payment_intent', metadata: { orderId: '111222333' } } } });
    for (let i = 1; i <= 3; i++) {
        const payload = failed();
        assert.equal((await post(payload, { 'stripe-signature': sign(payload) })).status, 200);
        const o = await ord1();
        assert.equal(o.failedPaymentAttempts, i);
        assert.equal(o.status, 'failed');
    }
});

test('un aviso de pago fallido no toca un pedido ya pagado', async () => {
    await db.client.order.update({ where: { id: 'ord1' }, data: { status: 'paid' } });
    const payload = JSON.stringify({ id: 'evt_f', object: 'event', type: 'charge.failed', data: { object: { id: 'ch_1', object: 'charge', metadata: { orderId: 'ord1' } } } });
    assert.equal((await post(payload, { 'stripe-signature': sign(payload) })).status, 200);
    const o = await ord1();
    assert.deepEqual([o.status, o.failedPaymentAttempts], ['paid', 0]);
});
