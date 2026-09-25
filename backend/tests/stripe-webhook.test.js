// Webhook de Stripe con FIRMA REAL sobre la aplicación completa (src/app.js): comprueba que el cuerpo
// llega sin procesar y la firma se verifica igual que en producción.
process.env.NO_LISTEN = '1';
process.env.STRIPE_SECRET_KEY = 'sk_test_dummy';
process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test_secret_for_unit_tests';
process.env.JWT_SECRET = 'test-secret';

const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

const src = (...p) => path.resolve(__dirname, '..', 'src', ...p);
const stubModule = (file, exports) => {
    require.cache[file] = { id: file, filename: file, loaded: true, exports, children: [], paths: [] };
};

const db = { config: null, orders: [] };
const matches = (row, where = {}) => Object.entries(where).every(([k, v]) => row[k] === v);
stubModule(src('config', 'prisma.js'), {
    configuration: { findUnique: async () => (db.config ? { id: 'disponibilidad', value: db.config } : null) },
    order: {
        findMany: async ({ where } = {}) => db.orders.filter(o => matches(o, where)).map(o => ({ ...o })),
        findFirst: async ({ where }) => { const o = db.orders.find(x => matches(x, where)); return o ? { ...o } : null; },
        findUnique: async ({ where }) => { const o = db.orders.find(x => matches(x, where)); return o ? { ...o } : null; },
        update: async ({ where, data }) => { const o = db.orders.find(x => x.id === where.id); Object.assign(o, data); return { ...o }; }
    },
    $withLock: async (_name, _t, fn) => fn()
});
stubModule(src('services', 'emailService.js'), {
    sendOrderConfirmationEmail: async () => {},
    sendSlotConflictRefundEmail: async () => true
});

const Stripe = require('stripe');
const app = require(src('app.js'));

let server; let base;
test.before(async () => { await new Promise(r => { server = app.listen(0, r); }); base = `http://127.0.0.1:${server.address().port}`; });
test.after(() => server.close());
test.beforeEach(() => {
    db.config = { deliveryDays: ['2099-03-03'], dailySlots: { 2: [{ start: '09:00', end: '13:00' }] } };
    db.orders = [{
        id: 'ord1', redsysOrderId: '111222333', status: 'pending', customer_email: 'a@a.com', customer_name: 'Ana',
        delivery_date: '2099-03-03', delivery_timeSlot: '10:00', createdAt: new Date(), updatedAt: new Date()
    }];
});

const eventBody = () => JSON.stringify({
    id: 'evt_1', object: 'event', type: 'checkout.session.completed',
    data: { object: { id: 'cs_test_1', object: 'checkout.session', payment_intent: 'pi_test_1', metadata: { orderId: '111222333' } } }
});
const sign = (payload) => new Stripe('sk_test_dummy').webhooks.generateTestHeaderString({ payload, secret: process.env.STRIPE_WEBHOOK_SECRET });
const post = (payload, headers) => fetch(`${base}/api/payment/stripe-webhook`, { method: 'POST', headers: { 'Content-Type': 'application/json', ...headers }, body: payload });

test('un aviso de pago con firma válida se acepta y el pedido pasa a paid', async () => {
    const payload = eventBody();
    const res = await post(payload, { 'stripe-signature': sign(payload) });
    assert.equal(res.status, 200);
    assert.equal(db.orders[0].status, 'paid');
    assert.equal(db.orders[0].stripePaymentIntent, 'pi_test_1');
});

test('un aviso con firma inválida se rechaza (400) y el pedido no cambia', async () => {
    const payload = eventBody();
    const res = await post(payload, { 'stripe-signature': 't=1,v1=firmafalsa' });
    assert.equal(res.status, 400);
    assert.equal(db.orders[0].status, 'pending');
});

test('un aviso alterado después de firmarse se rechaza', async () => {
    const payload = eventBody();
    const header = sign(payload);
    const tampered = payload.replace('111222333', '999999999');
    const res = await post(tampered, { 'stripe-signature': header });
    assert.equal(res.status, 400);
    assert.equal(db.orders[0].status, 'pending');
});

test('un aviso sin cabecera de firma se rechaza', async () => {
    const res = await post(eventBody(), {});
    assert.equal(res.status, 400);
    assert.equal(db.orders[0].status, 'pending');
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
            assert.equal(db.orders[0].status, 'pending');
        }
    } finally {
        process.env.NODE_ENV = prev.env;
        process.env.STRIPE_WEBHOOK_SECRET = prev.secret;
    }
});
