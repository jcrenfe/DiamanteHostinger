// Pagos concurrentes: retención ampliada durante el pago (C) y reconfirmación con reembolso automático (A).
process.env.STRIPE_SECRET_KEY = 'sk_test_x';
delete process.env.STRIPE_WEBHOOK_SECRET;

const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const express = require('express');

const src = (...p) => path.resolve(__dirname, '..', 'src', ...p);
const stubModule = (file, exports) => {
    require.cache[file] = { id: file, filename: file, loaded: true, exports, children: [], paths: [] };
};

// ---------- Prisma simulado ----------
const db = { config: null, orders: [] };
const locks = new Map();
const tick = () => new Promise(r => setImmediate(r));
const matches = (row, where = {}) => Object.entries(where).every(([k, v]) => row[k] === v);
stubModule(src('config', 'prisma.js'), {
    configuration: { findUnique: async () => (db.config ? { id: 'disponibilidad', value: db.config } : null) },
    order: {
        findMany: async ({ where } = {}) => { const r = db.orders.filter(o => matches(o, where)).map(o => ({ ...o })); await tick(); return r; },
        findFirst: async ({ where }) => { await tick(); const o = db.orders.find(x => matches(x, where)); return o ? { ...o } : null; },
        findUnique: async ({ where }) => { await tick(); const o = db.orders.find(x => matches(x, where)); return o ? { ...o } : null; },
        update: async ({ where, data }) => { await tick(); const o = db.orders.find(x => x.id === where.id); Object.assign(o, data); return { ...o }; }
    },
    $withLock: async (name, _t, fn) => {
        const prev = locks.get(name) || Promise.resolve();
        let release; const mine = new Promise(r => { release = r; });
        locks.set(name, prev.then(() => mine));
        await prev;
        try { return await fn(); } finally { release(); }
    }
});

// ---------- Email y Stripe simulados ----------
const emails = [];
stubModule(src('services', 'emailService.js'), {
    sendOrderConfirmationEmail: async () => {},
    sendSlotConflictRefundEmail: async (order, refunded) => { emails.push({ id: order.id, refunded }); return true; }
});
const stripeCalls = { sessions: [], refunds: [] };
let refundShouldFail = false;
const seenKeys = new Map();
const fakeStripe = () => ({
    checkout: { sessions: { create: async (params) => { stripeCalls.sessions.push(params); return { id: `cs_${stripeCalls.sessions.length}`, client_secret: 'secret' }; } } },
    refunds: {
        create: async (params, opts) => {
            if (refundShouldFail) throw new Error('refund down');
            if (seenKeys.has(opts.idempotencyKey)) return seenKeys.get(opts.idempotencyKey); // Stripe devuelve el mismo reembolso
            stripeCalls.refunds.push({ params, opts });
            const r = { id: `re_${stripeCalls.refunds.length}` };
            seenKeys.set(opts.idempotencyKey, r);
            return r;
        }
    }
});
stubModule(require.resolve('stripe'), fakeStripe);

const availability = require(src('services', 'availability.js'));
const paymentRoutes = require(src('routes', 'payment.js'));

const app = express();
app.use(express.json());
app.use('/api/payment', paymentRoutes);
let server; let base;
test.before(async () => { await new Promise(r => { server = app.listen(0, r); }); base = `http://127.0.0.1:${server.address().port}/api/payment`; });
test.after(() => server.close());
test.beforeEach(() => {
    db.orders = []; emails.length = 0; stripeCalls.sessions.length = 0; stripeCalls.refunds.length = 0;
    refundShouldFail = false; seenKeys.clear();
    db.config = {
        deliveryDays: ['2099-03-03'], dailySlots: { 2: [{ start: '09:00', end: '13:00' }] },
        blockingRules: { near: { beforeMinutes: 60, afterMinutes: 30 }, medium: { beforeMinutes: 90, afterMinutes: 60 }, far: { beforeMinutes: 120, afterMinutes: 90 } }
    };
});

const ago = (min) => new Date(Date.now() - min * 60000);
const order = (id, slot, extra = {}) => ({
    id, redsysOrderId: `R${id}`, status: 'pending', customer_name: 'Ana', customer_email: `${id}@x.com`,
    delivery_date: '2099-03-03', delivery_timeSlot: slot, delivery_proximity: 'near', createdAt: new Date(), updatedAt: new Date(), ...extra
});
const create = (o) => fetch(`${base}/create-payment`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ amount: 20, orderId: o.redsysOrderId }) });
const webhook = (o, sessionId = 'cs_x') => fetch(`${base}/stripe-webhook`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ type: 'checkout.session.completed', data: { object: { id: sessionId, payment_intent: `pi_${o.id}`, metadata: { orderId: o.redsysOrderId } } } })
});
const get = (id) => db.orders.find(o => o.id === id);

// ================================================================ C) retención ampliada durante el pago
test('C: al iniciar el pago la sesión caduca a los 31 min y el pedido queda con el pago en curso', async () => {
    const o = order('a', '10:00'); db.orders = [o];
    const res = await create(o);
    assert.equal(res.status, 200);
    assert.equal((await res.json()).sessionId, 'cs_1');
    const secs = stripeCalls.sessions[0].expires_at - Math.floor(Date.now() / 1000);
    assert.ok(secs >= 31 * 60 - 5 && secs <= 31 * 60 + 5, `expires_at a ${secs}s`);
    assert.equal(get('a').stripeSessionId, 'cs_1');
});

test('C: un pago en curso retiene la hora 31 min aunque pasen los 10 min de retención normal', () => {
    const paying = order('a', '10:00', { createdAt: ago(20), updatedAt: ago(5), stripeSessionId: 'cs_1' });
    const abandoned = order('b', '10:00', { createdAt: ago(20), updatedAt: ago(20) });
    assert.equal(availability.isActiveBooking(paying), true);
    assert.equal(availability.isActiveBooking(abandoned), false);
    assert.equal(availability.isActiveBooking({ ...paying, updatedAt: ago(32) }), false);
});

test('C: mientras otro cliente está pagando esa hora, nadie más puede reservarla ni empezar a pagarla', async () => {
    const paying = order('a', '10:00', { createdAt: ago(20), updatedAt: ago(5), stripeSessionId: 'cs_1' });
    const intruder = order('b', '10:00', { createdAt: ago(1) });
    db.orders = [paying, intruder];
    const res = await create(intruder);
    assert.equal(res.status, 409);
    assert.equal((await res.json()).reason, 'slot_unavailable');
    assert.equal(stripeCalls.sessions.length, 0);
});

test('C: un pedido caducado cuya hora ha tomado otro (ya pagado) no puede abrir la pasarela', async () => {
    const expired = order('a', '10:00', { createdAt: ago(20), updatedAt: ago(20) });
    const winner = order('b', '10:00', { status: 'paid' });
    db.orders = [expired, winner];
    const res = await create(expired);
    assert.equal(res.status, 409);
    assert.equal(stripeCalls.sessions.length, 0);
});

test('C: un pedido caducado con la hora todavía libre puede pagar y recupera la retención', async () => {
    const expired = order('a', '10:00', { createdAt: ago(20), updatedAt: ago(20) });
    db.orders = [expired];
    assert.equal((await create(expired)).status, 200);
    assert.equal(availability.isActiveBooking(get('a')), true);
});

test('C: no se abre pasarela para un pedido ya pagado o cerrado', async () => {
    db.orders = [order('a', '10:00', { status: 'paid' }), order('b', '12:00', { status: 'refunded' })];
    assert.equal((await create(db.orders[0])).status, 409);
    assert.equal((await create(db.orders[1])).status, 409);
    assert.equal(stripeCalls.sessions.length, 0);
});

// ================================================================ A) reconfirmación + reembolso automático
test('A: pago sin conflicto → el pedido pasa a paid y no hay reembolso', async () => {
    const o = order('a', '10:00'); db.orders = [o];
    await webhook(o);
    assert.equal(get('a').status, 'paid');
    assert.equal(stripeCalls.refunds.length, 0);
    assert.equal(emails.length, 0);
});

test('A: pago con la hora ya consumida por otro pedido pagado → reembolso, estado refunded y email', async () => {
    const late = order('a', '10:00', { createdAt: ago(20), updatedAt: ago(20) });
    const winner = order('b', '10:00', { status: 'paid' });
    db.orders = [late, winner];
    await webhook(late, 'cs_late');
    assert.equal(get('a').status, 'refunded');
    assert.equal(get('b').status, 'paid');
    assert.equal(stripeCalls.refunds.length, 1);
    assert.deepEqual(stripeCalls.refunds[0].params, { payment_intent: 'pi_a' });
    assert.equal(stripeCalls.refunds[0].opts.idempotencyKey, 'slot-conflict-cs_late');
    assert.deepEqual(emails, [{ id: 'a', refunded: true }]);
    assert.equal(availability.isActiveBooking(get('a')), false);
});

test('A: el conflicto también se detecta por zona de bloqueo (pagado 10:00 near bloquea 10:30)', async () => {
    const late = order('a', '10:30'); const winner = order('b', '10:00', { status: 'paid' });
    db.orders = [late, winner];
    await webhook(late);
    assert.equal(get('a').status, 'refunded');
});

test('A: si el otro pedido solo tiene la hora retenida (sin pagar), gana el que ya ha pagado', async () => {
    const payer = order('a', '10:00', { createdAt: ago(20), updatedAt: ago(20) });
    const holder = order('b', '10:00', { createdAt: ago(1) });
    db.orders = [payer, holder];
    await webhook(payer);
    assert.equal(get('a').status, 'paid');
    assert.equal(stripeCalls.refunds.length, 0);
    // y el que solo retenía, si intenta pagar después, es rechazado
    assert.equal((await create(holder)).status, 409);
});

test('A: el webhook repetido por Stripe no reembolsa dos veces ni reenvía el email', async () => {
    const late = order('a', '10:00'); const winner = order('b', '10:00', { status: 'paid' });
    db.orders = [late, winner];
    await webhook(late); await webhook(late);
    assert.equal(stripeCalls.refunds.length, 1);
    assert.equal(emails.length, 1);
});

test('A: si el reembolso automático falla, el pedido queda en paid_conflict (revisión manual), libera la hora y avisa', async () => {
    const late = order('a', '10:00'); const winner = order('b', '10:00', { status: 'paid' });
    db.orders = [late, winner];
    refundShouldFail = true;
    const res = await webhook(late);
    assert.equal(res.status, 200);
    assert.equal(get('a').status, 'paid_conflict');
    assert.equal(availability.isActiveBooking(get('a')), false);
    assert.deepEqual(emails, [{ id: 'a', refunded: false }]);
});

test('A: un pedido cancelado por fallos de pago que llega a pagarse sin conflicto se recupera como paid', async () => {
    const o = order('a', '10:00', { status: 'cancelled' }); db.orders = [o];
    await webhook(o);
    assert.equal(get('a').status, 'paid');
});

test('A+C concurrencia: dos clientes con la misma hora pagan a la vez → uno queda paid y el otro reembolsado', async () => {
    const a = order('a', '10:00', { createdAt: ago(20), updatedAt: ago(20) });
    const b = order('b', '10:00', { createdAt: ago(20), updatedAt: ago(20) });
    db.orders = [a, b];
    await Promise.all([webhook(a, 'cs_a'), webhook(b, 'cs_b')]);
    const statuses = [get('a').status, get('b').status].sort();
    assert.deepEqual(statuses, ['paid', 'refunded']);
    assert.equal(stripeCalls.refunds.length, 1);
    assert.equal(emails.length, 1);
});

test('A+C concurrencia: 8 pagos simultáneos de la misma hora → exactamente 1 pagado y 7 reembolsados', async () => {
    db.orders = Array.from({ length: 8 }, (_, i) => order(`p${i}`, '10:00', { createdAt: ago(20), updatedAt: ago(20) }));
    await Promise.all(db.orders.map(o => webhook(o, `cs_${o.id}`)));
    assert.equal(db.orders.filter(o => o.status === 'paid').length, 1);
    assert.equal(db.orders.filter(o => o.status === 'refunded').length, 7);
    assert.equal(stripeCalls.refunds.length, 7);
});

test('A: pagos simultáneos de horas compatibles se confirman todos', async () => {
    db.orders = ['09:00', '11:00', '12:30'].map((t, i) => order(`h${i}`, t));
    await Promise.all(db.orders.map(o => webhook(o)));
    assert.deepEqual(db.orders.map(o => o.status), ['paid', 'paid', 'paid']);
    assert.equal(stripeCalls.refunds.length, 0);
});
