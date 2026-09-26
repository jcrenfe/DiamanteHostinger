// Productos, categorías, ofertas, autenticación, ruta de reparto y campañas contra la base de datos real
// de pruebas: filtrado de campos, conversión de tipos, 404/409 y datos guardados.
require('./helpers/env');
const { src, maps, sentMails, resetStubs } = require('./helpers/stubs');
const db = require('./helpers/db');

const test = require('node:test');
const assert = require('node:assert/strict');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

const app = require(src('app.js'));
let server; let base;
test.before(async () => { await new Promise(r => { server = app.listen(0, r); }); base = `http://127.0.0.1:${server.address().port}/api`; });
test.after(async () => { server.close(); await db.client.$disconnect(); });
test.beforeEach(async () => { resetStubs(); await db.reset(); });

const ADMIN = jwt.sign({ uid: 'adm', role: 'admin', email: 'adm@x.com' }, process.env.JWT_SECRET);
const CLIENT = jwt.sign({ uid: 'u1', role: 'cliente', email: 'u1@x.com' }, process.env.JWT_SECRET);
const call = async (method, url, { body, auth } = {}) => {
    const res = await fetch(base + url, {
        method,
        headers: { 'Content-Type': 'application/json', ...(auth ? { Authorization: `Bearer ${auth}` } : {}) },
        body: body ? JSON.stringify(body) : undefined
    });
    const text = await res.text();
    let json; try { json = JSON.parse(text); } catch { json = text; }
    return { status: res.status, body: json };
};

// ================================================================ productos
test('productos: crear guarda solo los campos conocidos, convierte tipos e ignora fechas e id ajenos', async () => {
    const r = await call('POST', '/products', { auth: ADMIN, body: {
        id: 'zumo', name: 'ZUMO', price: '4.5', showOnHome: 'true', category: 'Bebidas',
        createdAt: '2000-01-01T00:00:00.000Z', inventado: 'x', updatedAt: 'basura'
    } });
    assert.equal(r.status, 200);
    const p = await db.client.product.findUnique({ where: { id: 'zumo' } });
    assert.deepEqual([p.name, p.price, p.showOnHome, p.category], ['ZUMO', 4.5, true, 'Bebidas']);
    assert.ok(p.createdAt.getFullYear() > 2020, 'createdAt lo pone la base de datos, no el cliente');
});

test('productos: sin id se genera uno; id repetido → 409', async () => {
    const r = await call('POST', '/products', { auth: ADMIN, body: { name: 'SIN ID' } });
    assert.equal(r.status, 200);
    assert.match(r.body.id, /^[0-9a-f-]{36}$/);
    await call('POST', '/products', { auth: ADMIN, body: { id: 'dup', name: 'A' } });
    assert.equal((await call('POST', '/products', { auth: ADMIN, body: { id: 'dup', name: 'B' } })).status, 409);
});

test('productos: precio no numérico → 400 y no se guarda', async () => {
    const r = await call('POST', '/products', { auth: ADMIN, body: { id: 'x', name: 'X', price: 'abc' } });
    assert.equal(r.status, 400);
    assert.equal(await db.client.product.count(), 0);
});

test('productos: actualizar es parcial, no cambia el id aunque venga en el cuerpo, y 404 si no existe', async () => {
    await db.client.product.create({ data: { id: 'p1', name: 'A', price: 10, description: 'desc' } });
    const r = await call('PUT', '/products/p1', { auth: ADMIN, body: { id: 'otro', price: 12, updatedAt: 'x' } });
    assert.equal(r.status, 200);
    const p = await db.client.product.findUnique({ where: { id: 'p1' } });
    assert.deepEqual([p.name, p.price, p.description], ['A', 12, 'desc']);
    assert.equal(await db.client.product.count(), 1);
    assert.equal((await call('PUT', '/products/nope', { auth: ADMIN, body: { name: 'X' } })).status, 404);
});

test('productos: borrar; borrar inexistente → 404; un cliente no puede crear ni borrar', async () => {
    await db.client.product.create({ data: { id: 'p1', name: 'A' } });
    assert.equal((await call('DELETE', '/products/p1', { auth: CLIENT })).status, 403);
    assert.equal((await call('POST', '/products', { auth: CLIENT, body: { id: 'z', name: 'Z' } })).status, 403);
    assert.equal((await call('DELETE', '/products/p1', { auth: ADMIN })).status, 200);
    assert.equal(await db.client.product.count(), 0);
    assert.equal((await call('DELETE', '/products/p1', { auth: ADMIN })).status, 404);
});

// ================================================================ categorías
test('categorías: crear sin id genera uno, convierte el orden y el booleano; actualizar y borrar con 404', async () => {
    const r = await call('POST', '/categories', { auth: ADMIN, body: { name: 'Bebidas', order: '3', isDefault: 1, raro: true } });
    assert.equal(r.status, 200);
    assert.deepEqual([r.body.name, r.body.order, r.body.isDefault], ['Bebidas', 3, true]);
    assert.equal((await call('PUT', `/categories/${r.body.id}`, { auth: ADMIN, body: { name: 'Zumos' } })).body.name, 'Zumos');
    assert.equal((await call('PUT', '/categories/nope', { auth: ADMIN, body: { name: 'X' } })).status, 404);
    assert.equal((await call('DELETE', `/categories/${r.body.id}`, { auth: ADMIN })).status, 200);
    assert.equal((await call('DELETE', `/categories/${r.body.id}`, { auth: ADMIN })).status, 404);
    assert.equal((await call('POST', '/categories', { auth: ADMIN, body: { name: 'X', order: 'dos' } })).status, 400);
});

test('categorías: el id propuesto por el panel se respeta', async () => {
    const r = await call('POST', '/categories', { auth: ADMIN, body: { id: 'cat-bebidas', name: 'Bebidas' } });
    assert.equal(r.body.id, 'cat-bebidas');
});

// ================================================================ ofertas
test('ofertas: crear sin id (antes fallaba), con colores, banda de descuento y fecha; ignora campos desconocidos', async () => {
    const r = await call('POST', '/offers', { auth: ADMIN, body: {
        title: 'Cupón', description: 'Otoño', type: 'coupon', active: true, code: 'OTONO', discountPercent: '15',
        titleColor: '#ffffff', badgeColor: '#ffcc00', codeColor: '#000000', discountCorner: true,
        discountColor: '#ffffff', discountBgColor: '#e67e22', validUntil: '2099-12-31', desconocido: 1, createdAt: 'x'
    } });
    assert.equal(r.status, 200);
    const o = await db.client.offer.findUnique({ where: { id: r.body.id } });
    assert.deepEqual([o.discountPercent, o.discountCorner, o.badgeColor, o.discountBgColor], [15, true, '#ffcc00', '#e67e22']);
    assert.equal(o.validUntil.toISOString().slice(0, 10), '2099-12-31');
    assert.equal(r.body.discountCorner, true);
});

test('ofertas: ?active=true filtra; actualizar parcial; borrar; 404 y fecha no válida → 400', async () => {
    await db.client.offer.create({ data: { id: 'a', title: 'A', active: true } });
    await db.client.offer.create({ data: { id: 'b', title: 'B', active: false } });
    assert.deepEqual((await call('GET', '/offers?active=true')).body.map(o => o.id), ['a']);
    assert.equal((await call('GET', '/offers')).body.length, 2);
    const upd = await call('PUT', '/offers/b', { auth: ADMIN, body: { active: true, discountCorner: false } });
    assert.deepEqual([upd.body.title, upd.body.active, upd.body.discountCorner], ['B', true, false]);
    assert.equal((await call('PUT', '/offers/nope', { auth: ADMIN, body: { title: 'X' } })).status, 404);
    assert.equal((await call('PUT', '/offers/a', { auth: ADMIN, body: { validUntil: 'no-es-fecha' } })).status, 400);
    assert.equal((await call('DELETE', '/offers/a', { auth: ADMIN })).status, 200);
    assert.equal((await call('DELETE', '/offers/a', { auth: ADMIN })).status, 404);
});

// ================================================================ autenticación
test('login: correcto, contraseña errónea, usuario sin contraseña (Google) y datos con tipo incorrecto', async () => {
    await db.client.user.create({ data: { uid: 'u1', email: 'ana@x.com', role: 'admin', password: await bcrypt.hash('secreto123', 4) } });
    await db.client.user.create({ data: { uid: 'u2', email: 'google@x.com' } });
    const ok = await call('POST', '/auth/login', { body: { email: 'ana@x.com', password: 'secreto123' } });
    assert.equal(ok.status, 200);
    assert.equal(jwt.verify(ok.body.token, process.env.JWT_SECRET).role, 'admin');
    assert.equal((await call('POST', '/auth/login', { body: { email: 'ana@x.com', password: 'mal' } })).status, 401);
    assert.match((await call('POST', '/auth/login', { body: { email: 'google@x.com', password: 'x' } })).body.error, /Google/);
    assert.equal((await call('POST', '/auth/login', { body: { email: { $ne: 1 }, password: 'x' } })).status, 400);
});

test('registro: guarda la contraseña cifrada con rol cliente; email repetido → 400', async () => {
    const r = await call('POST', '/auth/register', { body: { email: 'nuevo@x.com', password: 'secreto123', displayName: 'Nuevo', role: 'admin' } });
    assert.equal(r.status, 200);
    const u = await db.client.user.findUnique({ where: { email: 'nuevo@x.com' } });
    assert.equal(u.role, 'cliente');
    assert.ok(await bcrypt.compare('secreto123', u.password));
    assert.equal((await call('POST', '/auth/register', { body: { email: 'nuevo@x.com', password: 'otra12345' } })).status, 400);
});

test('registro: dos altas simultáneas con el mismo email → solo una se guarda', async () => {
    const rs = await Promise.all([1, 2, 3].map(() => call('POST', '/auth/register', { body: { email: 'mismo@x.com', password: 'secreto123' } })));
    assert.equal(rs.filter(r => r.status === 200).length, 1);
    assert.equal(await db.client.user.count({ where: { email: 'mismo@x.com' } }), 1);
});

// ================================================================ ruta de reparto
test('ruta de reparto: usa el origen del panel y los pedidos de la base; valida fecha, estado y límites', async () => {
    await db.setConfig({ originAddress: 'Calle Origen 1, Madrid' });
    await db.insertOrders([
        { id: 'r1', delivery_date: '2099-06-15', delivery_timeSlot: '10:00', status: 'paid', delivery_addressExtra: '2º B' },
        { id: 'r2', delivery_date: '2099-06-15', delivery_timeSlot: '09:30', status: 'pending' },
        { id: 'r3', delivery_date: '2099-06-15', delivery_timeSlot: '11:00', status: 'refunded' }
    ]);
    maps.matrix = (i, j) => (i === j ? { minutes: 0, km: 0 } : { minutes: 5, km: 2 });
    const ok = await call('POST', '/logistics/optimize', { auth: ADMIN, body: { date: '2099-06-15', orderIds: ['r1', 'r2'], marginMinutes: 10 } });
    assert.equal(ok.status, 200);
    assert.equal(ok.body.origin, 'Calle Origen 1, Madrid');
    assert.deepEqual(ok.body.stops.map(s => s.id), ['r2', 'r1']);
    assert.equal(ok.body.stops[1].addressExtra, '2º B');
    assert.equal((await call('POST', '/logistics/optimize', { auth: ADMIN, body: { date: '2099-06-15', orderIds: ['r3'] } })).status, 400);
    assert.equal((await call('POST', '/logistics/optimize', { auth: ADMIN, body: { date: '2099-06-16', orderIds: ['r1'] } })).status, 400);
    assert.equal((await call('POST', '/logistics/optimize', { auth: ADMIN, body: { date: '2099-06-15', orderIds: [] } })).status, 400);
    assert.equal((await call('POST', '/logistics/optimize', { auth: CLIENT, body: { date: '2099-06-15', orderIds: ['r1'] } })).status, 403);
    const many = Array.from({ length: 25 }, (_, i) => `x${i}`);
    assert.equal((await call('POST', '/logistics/optimize', { auth: ADMIN, body: { date: '2099-06-15', orderIds: many } })).status, 400);
});

test('ruta de reparto: sin dirección de origen configurada → 400', async () => {
    await db.insertOrders([{ id: 'r1', delivery_date: '2099-06-15', status: 'paid' }]);
    assert.equal((await call('POST', '/logistics/optimize', { auth: ADMIN, body: { date: '2099-06-15', orderIds: ['r1'] } })).status, 400);
});

// ================================================================ campañas
test('campañas: solo un administrador puede enviar; sin campaña asociada el envío se hace', async () => {
    assert.equal((await call('POST', '/campaign/send-bulk', { body: { recipients: ['a@x.com'] } })).status, 401);
    assert.equal((await call('POST', '/campaign/send-bulk', { auth: CLIENT, body: { recipients: ['a@x.com'] } })).status, 403);
    const ok = await call('POST', '/campaign/send-bulk', { auth: ADMIN, body: { header: 'H', message: 'M', recipients: ['a@x.com', 'b@x.com'] } });
    assert.equal(ok.status, 200);
    assert.equal(sentMails.length, 2);
});

test.todo('campañas: al enviar una campaña guardada se actualiza su estado (hoy falla: columnas sentCount y lastSentAt inexistentes; pendiente de decidir)');
