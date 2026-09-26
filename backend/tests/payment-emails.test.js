// Correos del pago y pago desde el enlace del correo (base de datos real de pruebas; Stripe y correo simulados).
// - La confirmación solo se envía cuando Stripe confirma el pago.
// - Si el pago no se completa (la sesión de Stripe caduca sin pagarse, o la pasarela no llega a abrirse),
//   el pedido queda pendiente de pago y se avisa una vez con un enlace para pagarlo.
// - Desde ese enlace se paga el MISMO pedido (mismo número), sin duplicarlo.
require('./helpers/env');
const { src, emails, stripe, maps, signWebhook, resetStubs } = require('./helpers/stubs');
const db = require('./helpers/db');

const test = require('node:test');
const assert = require('node:assert/strict');

const { paymentUrl } = require(src('services', 'paymentLink.js'));
const app = require(src('app.js'));

let server; let base;
test.before(async () => { await new Promise(r => { server = app.listen(0, r); }); base = `http://127.0.0.1:${server.address().port}/api`; });
test.after(async () => { server.close(); await db.client.$disconnect(); });
test.beforeEach(async () => {
    resetStubs();
    maps.route = { minutes: 10, km: 5 };
    await db.reset();
    await db.setConfig({
        deliveryDays: ['2099-03-03'], dailySlots: { 2: [{ start: '09:00', end: '13:00' }] },
        blockingRules: { near: { beforeMinutes: 60, afterMinutes: 30 } }, originAddress: 'Origen 1, Madrid'
    });
});

const tick = () => new Promise(r => setTimeout(r, 50));
const ago = (min) => new Date(Date.now() - min * 60000);
const post = (url, body) => fetch(base + url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
const webhook = (type, object) => {
    const payload = JSON.stringify({ id: `evt_${Math.random()}`, object: 'event', type, data: { object } });
    return fetch(`${base}/payment/stripe-webhook`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'stripe-signature': signWebhook(payload) }, body: payload });
};
const paid = (orderId, sessionId = 'cs_ok') => webhook('checkout.session.completed', { id: sessionId, object: 'checkout.session', payment_intent: `pi_${orderId}`, metadata: { orderId } });
const failed = (orderId) => webhook('payment_intent.payment_failed', { id: `pi_${orderId}`, object: 'payment_intent', metadata: { orderId } });
const expired = (orderId, sessionId = 'cs_1') => webhook('checkout.session.expired', { id: sessionId, object: 'checkout.session', metadata: { orderId } });
const seedOrder = (extra = {}) => db.insertOrders([{
    id: 'P1', redsysOrderId: 'P1', customer_name: 'Ana', customer_email: 'ana@x.com', total: 40.5,
    delivery_date: '2099-03-03', delivery_timeSlot: '10:00', delivery_proximity: 'near',
    items: [{ name: 'DESAYUNO', price: 35, quantity: 1 }, { name: 'GLOBO', price: 5.5, quantity: 1 }], ...extra
}]);
const tokenOf = (url) => new URL(url).searchParams.get('t');

// ================================================================ confirmación solo con el pago confirmado
test('crear el pedido NO envía la confirmación; el aviso de pago de Stripe sí, con las líneas guardadas', async () => {
    const res = await post('/orders', { id: 'N1', total: 20, customer: { name: 'Ana', email: 'ana@x.com', phone: '600000000' }, delivery: { address: 'C/ Uno 1', city: 'Madrid', zip: '28001', date: '2099-03-03', timeSlot: '10:00' }, items: [{ product: { id: 'p1', name: 'DESAYUNO', price: 20 }, quantity: 1 }] });
    assert.equal(res.status, 200);
    await tick();
    assert.equal(emails.confirmations.length, 0, 'no debe haber confirmación antes de pagar');
    await paid('N1');
    await tick();
    assert.equal(emails.confirmations.length, 1);
    assert.equal(emails.confirmations[0].id, 'N1');
    assert.deepEqual(emails.confirmations[0].order.items.map(i => i.name), ['DESAYUNO']);
    assert.equal(emails.confirmations[0].order.status, 'paid');
});

test('un aviso de pago repetido por Stripe no reenvía la confirmación', async () => {
    await seedOrder();
    await paid('P1'); await paid('P1');
    await tick();
    assert.equal(emails.confirmations.length, 1);
});

test('un pago reembolsado por conflicto de hora solo recibe el correo de reembolso', async () => {
    await seedOrder({ createdAt: ago(20), updatedAt: ago(20) });
    await db.insertOrders([{ id: 'W', status: 'paid', delivery_date: '2099-03-03', delivery_timeSlot: '10:00' }]);
    await paid('P1');
    await tick();
    assert.equal((await db.order('P1')).status, 'refunded');
    assert.equal(emails.confirmations.length, 0);
    assert.equal(emails.refunds.length, 1);
});

test('un aviso repetido de un pedido ya entregado no lo devuelve a pagado', async () => {
    await seedOrder({ status: 'delivered' });
    await paid('P1');
    assert.equal((await db.order('P1')).status, 'delivered');
});

// ================================================================ pago no completado → pendiente de pago + aviso con enlace
test('pago fallido: el pedido queda pendiente de pago (nunca se cancela) y todavía NO se avisa', async () => {
    await seedOrder({ stripeSessionId: 'cs_1' });
    await failed('P1'); await failed('P1'); await failed('P1');
    const o = await db.order('P1');
    assert.deepEqual([o.status, o.failedPaymentAttempts, o.paymentIssueEmailAt], ['failed', 3, null]);
    assert.equal(emails.paymentProblems.length, 0);
});

test('fallo y pago correcto en la misma pasarela: solo llega la confirmación', async () => {
    await seedOrder({ stripeSessionId: 'cs_1' });
    await failed('P1');
    await paid('P1', 'cs_1');
    await tick();
    assert.equal(emails.paymentProblems.length, 0);
    assert.equal(emails.confirmations.length, 1);
});

test('sesión caducada sin pagar: se libera la retención y se envía UN aviso con el enlace de pago', async () => {
    await seedOrder({ status: 'failed', stripeSessionId: 'cs_1' });
    await expired('P1', 'cs_1'); await expired('P1', 'cs_1');
    const o = await db.order('P1');
    assert.equal(o.status, 'failed');
    assert.equal(o.stripeSessionId, null);
    assert.ok(o.paymentIssueEmailAt instanceof Date);
    assert.equal(emails.paymentProblems.length, 1);
    assert.match(emails.paymentProblems[0].url, /\/pagar\/P1\?t=/);
    assert.equal(emails.paymentProblems[0].order.items.length, 2);
});

test('sesión caducada de un pedido que se abandonó sin intentar pagar: también se avisa', async () => {
    await seedOrder({ stripeSessionId: 'cs_1' });
    await expired('P1', 'cs_1');
    assert.equal(emails.paymentProblems.length, 1);
    assert.equal((await db.order('P1')).status, 'pending');
});

test('caducidades simultáneas no generan correos duplicados', async () => {
    await seedOrder({ stripeSessionId: 'cs_1' });
    await Promise.all([expired('P1', 'cs_1'), expired('P1', 'cs_1'), expired('P1', 'cs_1')]);
    assert.equal(emails.paymentProblems.length, 1);
});

test('la caducidad de una sesión antigua no avisa si el pedido tiene otra sesión de pago abierta', async () => {
    await seedOrder({ stripeSessionId: 'cs_nueva' });
    await expired('P1', 'cs_vieja');
    assert.equal(emails.paymentProblems.length, 0);
    assert.equal((await db.order('P1')).stripeSessionId, 'cs_nueva');
});

test('la caducidad de la sesión de un pedido pagado, entregado o cerrado no avisa', async () => {
    for (const status of ['paid', 'delivered', 'cancelled', 'refunded']) {
        await db.reset();
        await seedOrder({ status, stripeSessionId: 'cs_1' });
        await expired('P1', 'cs_1');
    }
    assert.equal(emails.paymentProblems.length, 0);
});

test('si la pasarela falla al abrirse: 500, se libera la retención y se avisa al cliente una vez', async () => {
    await seedOrder();
    stripe.sessionShouldFail = true;
    const r1 = await post('/payment/create-payment', { orderId: 'P1' });
    assert.equal(r1.status, 500);
    assert.match((await r1.json()).error, /correo/);
    await post('/payment/create-payment', { orderId: 'P1' });
    const o = await db.order('P1');
    assert.equal(o.stripeSessionId, null);
    assert.equal(emails.paymentProblems.length, 1);
});

// ================================================================ pagar desde el enlace del correo
test('enlace de pago: sin firma o con firma de otro pedido → 403; con firma → datos para revisar y pagar', async () => {
    await seedOrder({ status: 'failed', delivery_addressExtra: '2º B' });
    const t = tokenOf(paymentUrl('P1'));
    assert.equal((await fetch(`${base}/orders/P1/payment`)).status, 403);
    assert.equal((await fetch(`${base}/orders/P1/payment?t=${tokenOf(paymentUrl('OTRO'))}`)).status, 403);
    const res = await fetch(`${base}/orders/P1/payment?t=${t}`);
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.status, 'payable');
    assert.equal(body.total, 40.5);
    assert.equal(body.delivery.addressExtra, '2º B');
    assert.deepEqual(body.items.map(i => [i.name, i.price, i.quantity]), [['DESAYUNO', 35, 1], ['GLOBO', 5.5, 1]]);
    assert.equal(body.customer_uid, undefined);
    assert.equal(body.stripeSessionId, undefined);
});

test('enlace de pago de un pedido ya pagado o cerrado informa del estado sin datos personales', async () => {
    await seedOrder({ status: 'paid' });
    await db.insertOrders([{ id: 'C1', status: 'refunded' }]);
    assert.deepEqual(await (await fetch(`${base}/orders/P1/payment?t=${tokenOf(paymentUrl('P1'))}`)).json(), { id: 'P1', status: 'paid' });
    assert.deepEqual(await (await fetch(`${base}/orders/C1/payment?t=${tokenOf(paymentUrl('C1'))}`)).json(), { id: 'C1', status: 'closed' });
});

test('pagar desde el enlace usa el MISMO pedido y su total guardado; al confirmarse queda pagado sin duplicarse', async () => {
    await seedOrder({ status: 'failed', createdAt: ago(60), updatedAt: ago(60), paymentIssueEmailAt: ago(50) });
    const r = await post('/payment/create-payment', { orderId: 'P1', amount: 0.01 });
    assert.equal(r.status, 200);
    assert.equal(stripe.sessions[0].line_items[0].price_data.unit_amount, 4050, 'el importe sale del pedido, no del navegador');
    assert.equal(stripe.sessions[0].metadata.orderId, 'P1');
    assert.equal(stripe.sessions[0].customer_email, 'ana@x.com');
    await paid('P1', (await r.json()).sessionId);
    await tick();
    assert.equal((await db.orders()).length, 1);
    assert.equal((await db.order('P1')).status, 'paid');
    assert.equal(emails.confirmations.length, 1);
});

test('pagar desde el enlace cuando otro cliente ya tiene la hora → 409 slot_unavailable, sin cobrar', async () => {
    await seedOrder({ status: 'failed', createdAt: ago(60), updatedAt: ago(60) });
    await db.insertOrders([{ id: 'W', status: 'paid', delivery_date: '2099-03-03', delivery_timeSlot: '10:00' }]);
    const r = await post('/payment/create-payment', { orderId: 'P1' });
    assert.equal(r.status, 409);
    assert.equal((await r.json()).reason, 'slot_unavailable');
    assert.equal(stripe.sessions.length, 0);
});

test('abrir la pasarela de un pedido inexistente → 404', async () => {
    assert.equal((await post('/payment/create-payment', { orderId: 'NOPE' })).status, 404);
    assert.equal((await post('/payment/create-payment', {})).status, 400);
});
