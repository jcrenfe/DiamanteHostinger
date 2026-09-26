// Pagos concurrentes: retención ampliada durante el pago (C) y reconfirmación con reembolso automático (A).
// Aplicación completa y base de datos real de pruebas: el bloqueo por fecha es el de la base (SlotLock).
require('./helpers/env');
const { src, emails, stripe, signWebhook, resetStubs } = require('./helpers/stubs');
const db = require('./helpers/db');

const test = require('node:test');
const assert = require('node:assert/strict');

const availability = require(src('services', 'availability.js'));
const app = require(src('app.js'));

let server; let base;
test.before(async () => { await new Promise(r => { server = app.listen(0, r); }); base = `http://127.0.0.1:${server.address().port}/api/payment`; });
test.after(async () => { server.close(); await db.client.$disconnect(); });
test.beforeEach(async () => {
    resetStubs();
    await db.reset();
    await db.setConfig({
        deliveryDays: ['2099-03-03'], dailySlots: { 2: [{ start: '09:00', end: '13:00' }] },
        blockingRules: { near: { beforeMinutes: 60, afterMinutes: 30 }, medium: { beforeMinutes: 90, afterMinutes: 60 }, far: { beforeMinutes: 120, afterMinutes: 90 } }
    });
});

const ago = (min) => new Date(Date.now() - min * 60000);
const order = (id, slot, extra = {}) => ({
    id, redsysOrderId: `R${id}`, status: 'pending', customer_name: 'Ana', customer_email: `${id}@x.com`,
    delivery_date: '2099-03-03', delivery_timeSlot: slot, delivery_proximity: 'near', createdAt: new Date(), updatedAt: new Date(), ...extra
});
const seed = (...orders) => db.insertOrders(orders);
const create = (o) => fetch(`${base}/create-payment`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ amount: 20, orderId: o.redsysOrderId }) });
const webhook = (o, sessionId = 'cs_x') => {
    const payload = JSON.stringify({ id: `evt_${sessionId}`, object: 'event', type: 'checkout.session.completed', data: { object: { id: sessionId, object: 'checkout.session', payment_intent: `pi_${o.id}`, metadata: { orderId: o.redsysOrderId } } } });
    return fetch(`${base}/stripe-webhook`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'stripe-signature': signWebhook(payload) }, body: payload });
};
const get = (id) => db.order(id);
const statusOf = async (id) => (await get(id)).status;

// ================================================================ C) retención ampliada durante el pago
test('C: al iniciar el pago la sesión caduca a los 31 min y el pedido queda con el pago en curso', async () => {
    const o = order('a', '10:00'); await seed(o);
    const res = await create(o);
    assert.equal(res.status, 200);
    assert.equal((await res.json()).sessionId, 'cs_test_1');
    const secs = stripe.sessions[0].expires_at - Math.floor(Date.now() / 1000);
    assert.ok(secs >= 31 * 60 - 5 && secs <= 31 * 60 + 5, `expires_at a ${secs}s`);
    assert.equal((await get('a')).stripeSessionId, 'cs_test_1');
});

test('C: un pago en curso retiene la hora 31 min aunque pasen los 10 min de retención normal', () => {
    const paying = order('a', '10:00', { createdAt: ago(20), updatedAt: ago(5), stripeSessionId: 'cs_1' });
    const abandoned = order('b', '10:00', { createdAt: ago(20), updatedAt: ago(20) });
    assert.equal(availability.isActiveBooking(paying), true);
    assert.equal(availability.isActiveBooking(abandoned), false);
    assert.equal(availability.isActiveBooking({ ...paying, updatedAt: ago(32) }), false);
});

test('C: al iniciar el pago se renueva updatedAt (empieza la retención ampliada)', async () => {
    const o = order('a', '10:00', { createdAt: ago(20), updatedAt: ago(20) }); await seed(o);
    assert.equal((await create(o)).status, 200);
    const age = (Date.now() - (await get('a')).updatedAt.getTime()) / 1000;
    assert.ok(age < 30, `updatedAt de hace ${age}s`);
});

test('C: mientras otro cliente está pagando esa hora, nadie más puede reservarla ni empezar a pagarla', async () => {
    const paying = order('a', '10:00', { createdAt: ago(20), updatedAt: ago(5), stripeSessionId: 'cs_1' });
    const intruder = order('b', '10:00', { createdAt: ago(1) });
    await seed(paying, intruder);
    const res = await create(intruder);
    assert.equal(res.status, 409);
    assert.equal((await res.json()).reason, 'slot_unavailable');
    assert.equal(stripe.sessions.length, 0);
});

test('C: un pedido caducado cuya hora ha tomado otro (ya pagado) no puede abrir la pasarela', async () => {
    const expired = order('a', '10:00', { createdAt: ago(20), updatedAt: ago(20) });
    const winner = order('b', '10:00', { status: 'paid' });
    await seed(expired, winner);
    assert.equal((await create(expired)).status, 409);
    assert.equal(stripe.sessions.length, 0);
});

test('C: un pedido caducado con la hora todavía libre puede pagar y recupera la retención', async () => {
    const expired = order('a', '10:00', { createdAt: ago(20), updatedAt: ago(20) });
    await seed(expired);
    assert.equal((await create(expired)).status, 200);
    assert.equal(availability.isActiveBooking(await get('a')), true);
});

test('C: no se abre pasarela para un pedido pagado, entregado o cerrado', async () => {
    const list = [order('a', '10:00', { status: 'paid' }), order('b', '12:00', { status: 'refunded' }), order('c', '11:00', { status: 'delivered' }), order('d', '09:00', { status: 'cancelled' })];
    await seed(...list);
    for (const o of list) assert.equal((await create(o)).status, 409, `pedido ${o.status}`);
    assert.equal(stripe.sessions.length, 0);
});

test('C: si Stripe falla al crear la sesión se libera la retención del pago', async () => {
    const o = order('a', '10:00'); await seed(o);
    stripe.sessionShouldFail = true;
    assert.equal((await create(o)).status, 500);
    assert.equal((await get('a')).stripeSessionId, null);
});

// ================================================================ A) reconfirmación + reembolso automático
test('A: pago sin conflicto → el pedido pasa a paid y no hay reembolso', async () => {
    const o = order('a', '10:00'); await seed(o);
    await webhook(o);
    const saved = await get('a');
    assert.equal(saved.status, 'paid');
    assert.equal(saved.stripePaymentIntent, 'pi_a');
    assert.equal(stripe.refunds.length, 0);
    assert.equal(emails.refunds.length, 0);
});

test('A: pago con la hora ya consumida por otro pedido pagado → reembolso, estado refunded y email', async () => {
    const late = order('a', '10:00', { createdAt: ago(20), updatedAt: ago(20) });
    const winner = order('b', '10:00', { status: 'paid' });
    await seed(late, winner);
    await webhook(late, 'cs_late');
    assert.equal(await statusOf('a'), 'refunded');
    assert.equal(await statusOf('b'), 'paid');
    assert.equal(stripe.refunds.length, 1);
    assert.deepEqual(stripe.refunds[0].params, { payment_intent: 'pi_a' });
    assert.equal(stripe.refunds[0].options.idempotencyKey, 'slot-conflict-cs_late');
    await new Promise(r => setImmediate(r));
    assert.deepEqual(emails.refunds, [{ id: 'a', refunded: true }]);
    assert.equal(availability.isActiveBooking(await get('a')), false);
});

test('A: el conflicto también se detecta por zona de bloqueo (pagado 10:00 near bloquea 10:30)', async () => {
    const late = order('a', '10:30'); const winner = order('b', '10:00', { status: 'paid' });
    await seed(late, winner);
    await webhook(late);
    assert.equal(await statusOf('a'), 'refunded');
});

test('A: un pedido entregado también cuenta como hora consumida', async () => {
    const late = order('a', '10:00'); const winner = order('b', '10:00', { status: 'delivered' });
    await seed(late, winner);
    await webhook(late);
    assert.equal(await statusOf('a'), 'refunded');
});

test('A: si el otro pedido solo tiene la hora retenida (sin pagar), gana el que ya ha pagado', async () => {
    const payer = order('a', '10:00', { createdAt: ago(20), updatedAt: ago(20) });
    const holder = order('b', '10:00', { createdAt: ago(1) });
    await seed(payer, holder);
    await webhook(payer);
    assert.equal(await statusOf('a'), 'paid');
    assert.equal(stripe.refunds.length, 0);
    // y el que solo retenía, si intenta pagar después, es rechazado
    assert.equal((await create(holder)).status, 409);
});

test('A: el webhook repetido por Stripe no reembolsa dos veces ni reenvía el email', async () => {
    const late = order('a', '10:00'); const winner = order('b', '10:00', { status: 'paid' });
    await seed(late, winner);
    await webhook(late); await webhook(late);
    await new Promise(r => setImmediate(r));
    assert.equal(stripe.refunds.length, 1);
    assert.equal(emails.refunds.length, 1);
});

test('A: si el reembolso automático falla, el pedido queda en paid_conflict (revisión manual), libera la hora y avisa', async () => {
    const late = order('a', '10:00'); const winner = order('b', '10:00', { status: 'paid' });
    await seed(late, winner);
    stripe.refundShouldFail = true;
    const res = await webhook(late);
    assert.equal(res.status, 200);
    assert.equal(await statusOf('a'), 'paid_conflict');
    assert.equal(availability.isActiveBooking(await get('a')), false);
    await new Promise(r => setImmediate(r));
    assert.deepEqual(emails.refunds, [{ id: 'a', refunded: false }]);
});

test('A: un pedido cancelado por fallos de pago que llega a pagarse sin conflicto se recupera como paid', async () => {
    const o = order('a', '10:00', { status: 'cancelled' }); await seed(o);
    await webhook(o);
    assert.equal(await statusOf('a'), 'paid');
});

test('A: un aviso de un pedido inexistente se ignora sin error', async () => {
    const res = await webhook(order('zz', '10:00'));
    assert.equal(res.status, 200);
    assert.equal((await db.orders()).length, 0);
});

test('A+C concurrencia: dos clientes con la misma hora pagan a la vez → uno queda paid y el otro reembolsado', async () => {
    const a = order('a', '10:00', { createdAt: ago(20), updatedAt: ago(20) });
    const b = order('b', '10:00', { createdAt: ago(20), updatedAt: ago(20) });
    await seed(a, b);
    await Promise.all([webhook(a, 'cs_a'), webhook(b, 'cs_b')]);
    const statuses = [await statusOf('a'), await statusOf('b')].sort();
    assert.deepEqual(statuses, ['paid', 'refunded']);
    assert.equal(stripe.refunds.length, 1);
    await new Promise(r => setImmediate(r));
    assert.equal(emails.refunds.length, 1);
});

test('A+C concurrencia: 8 pagos simultáneos de la misma hora → exactamente 1 pagado y 7 reembolsados', async () => {
    const list = Array.from({ length: 8 }, (_, i) => order(`p${i}`, '10:00', { createdAt: ago(20), updatedAt: ago(20) }));
    await seed(...list);
    await Promise.all(list.map(o => webhook(o, `cs_${o.id}`)));
    const all = await db.orders();
    assert.equal(all.filter(o => o.status === 'paid').length, 1);
    assert.equal(all.filter(o => o.status === 'refunded').length, 7);
    assert.equal(stripe.refunds.length, 7);
});

test('A: pagos simultáneos de horas compatibles se confirman todos', async () => {
    const list = ['09:00', '11:00', '12:30'].map((t, i) => order(`h${i}`, t));
    await seed(...list);
    await Promise.all(list.map(o => webhook(o)));
    assert.deepEqual((await db.orders()).map(o => o.status), ['paid', 'paid', 'paid']);
    assert.equal(stripe.refunds.length, 0);
});
