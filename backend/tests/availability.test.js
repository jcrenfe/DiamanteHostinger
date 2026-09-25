// Ejecutar con: npm test   (node --test, sin base de datos: Prisma y el correo van simulados)
process.env.GOOGLE_MAPS_API_KEY = 'test-key';
process.env.JWT_SECRET = 'test-secret';

const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const express = require('express');
const jwt = require('jsonwebtoken');
const axios = require('axios');

const src = (...p) => path.resolve(__dirname, '..', 'src', ...p);
const stubModule = (file, exports) => {
    require.cache[file] = { id: file, filename: file, loaded: true, exports, children: [], paths: [] };
};

// ---------- Prisma simulado (en memoria) ----------
const db = { config: null, orders: [] };
const locks = new Map(); // exclusión mutua por nombre, equivalente a GET_LOCK dentro de un proceso
const tick = () => new Promise(r => setImmediate(r));
const matches = (row, where = {}) => Object.entries(where).every(([k, v]) => row[k] === v);
stubModule(src('config', 'prisma.js'), {
    configuration: {
        findUnique: async () => (db.config ? { id: 'disponibilidad', value: db.config } : null),
        upsert: async ({ update }) => { db.config = update.value; return { value: db.config }; }
    },
    order: {
        findMany: async ({ where } = {}) => { const rows = db.orders.filter(o => matches(o, where)); await tick(); return rows; },
        create: async ({ data }) => { await tick(); const o = { id: `o${db.orders.length + 1}`, ...data }; db.orders.push(o); return o; }
    },
    $withLock: async (name, _t, fn) => {
        const prev = locks.get(name) || Promise.resolve();
        let release; const mine = new Promise(r => { release = r; });
        locks.set(name, prev.then(() => mine));
        await prev;
        try { return await fn(); } finally { release(); }
    }
});
stubModule(src('services', 'emailService.js'), { sendOrderConfirmationEmail: async () => {} });

// Google Maps simulado
let route = { minutes: 10, km: 5 };
let geocodeOk = true;
axios.get = async () => geocodeOk
    ? { data: { status: 'OK', results: [{ formatted_address: 'X', geometry: { location: { lat: 1, lng: 1 } } }] } }
    : { data: { status: 'ZERO_RESULTS', results: [] } };
axios.post = async () => ({ data: [{ distanceMeters: route.km * 1000, duration: `${route.minutes * 60}s` }] });

const ordersRoutes = require(src('routes', 'orders.js'));
const configRoutes = require(src('routes', 'config.js'));
const { checkDeliveryDistance } = require(src('services', 'deliveryDistance.js'));

const app = express();
app.use(express.json());
app.use('/api/orders', ordersRoutes);
app.use('/api/config', configRoutes);

let server; let base;
test.before(async () => {
    await new Promise(r => { server = app.listen(0, r); });
    base = `http://127.0.0.1:${server.address().port}/api`;
});
test.after(() => server.close());
test.beforeEach(() => { db.config = null; db.orders = []; route = { minutes: 10, km: 5 }; geocodeOk = true; });

const token = (role, uid = 'u1') => jwt.sign({ uid, role, email: `${uid}@x.com` }, process.env.JWT_SECRET);
const call = (method, url, { body, auth } = {}) => fetch(base + url, {
    method,
    headers: { 'Content-Type': 'application/json', ...(auth ? { Authorization: `Bearer ${auth}` } : {}) },
    body: body ? JSON.stringify(body) : undefined
});
const baseConfig = () => ({
    deliveryDays: ['2099-03-03'],
    dailySlots: { 2: [{ start: '09:00', end: '13:00' }] },
    blockingRules: { near: { beforeMinutes: 60, afterMinutes: 30 }, medium: { beforeMinutes: 90, afterMinutes: 60 }, far: { beforeMinutes: 120, afterMinutes: 90 } },
    originAddress: 'Calle Origen 1, Madrid',
    proximityThresholds: { nearMaxMinutes: 15, mediumMaxMinutes: 30 },
    maxDeliveryMinutes: 60,
    deliverySurcharges: { medium: { type: 'fixed', amount: 3 }, far: { type: 'perKm', amount: 0.5 } }
});
const newOrder = (date, timeSlot, extra = {}) => ({
    id: 'nuevo', total: 20, customer: { uid: 'u1', name: 'A', email: 'a@a.com', phone: '600000000' },
    delivery: { address: 'C/ Uno 1', city: 'Madrid', zip: '28001', date, timeSlot }, items: [], ...extra
});

// ---------------------------------------------------------------- config guardada
test('la configuración guardada por el panel se devuelve idéntica al cliente', async () => {
    const cfg = baseConfig();
    const save = await call('POST', '/config/appointment', { body: cfg, auth: token('admin') });
    assert.equal(save.status, 200);
    const res = await call('GET', '/config/appointment');
    assert.deepEqual(await res.json(), cfg);
});

test('sin configuración guardada el endpoint responde 404 (el frontend usa valores por defecto)', async () => {
    assert.equal((await call('GET', '/config/appointment')).status, 404);
});

test('solo un administrador autenticado debe poder modificar la disponibilidad', async () => {
    const anon = await call('POST', '/config/appointment', { body: baseConfig() });
    assert.ok([401, 403].includes(anon.status), `un anónimo pudo guardar la configuración (status ${anon.status})`);
    const customer = await call('POST', '/config/appointment', { body: baseConfig(), auth: token('cliente') });
    assert.ok([401, 403].includes(customer.status), `un cliente pudo guardar la configuración (status ${customer.status})`);
});

// ---------------------------------------------------------------- lectura de pedidos (usada para bloquear horas)
test('GET /orders exige token: sin sesión responde 401', async () => {
    assert.equal((await call('GET', '/orders')).status, 401);
});

test('GET /orders: un cliente solo recibe sus propios pedidos; el admin recibe todos', async () => {
    db.orders = [{ id: 'a', customer_uid: 'u1', delivery_date: '2099-03-03', delivery_timeSlot: '10:00' },
                 { id: 'b', customer_uid: 'u2', delivery_date: '2099-03-03', delivery_timeSlot: '11:00' }];
    const mine = await (await call('GET', '/orders', { auth: token('cliente', 'u1') })).json();
    assert.deepEqual(mine.map(o => o.id), ['a']);
    const all = await (await call('GET', '/orders', { auth: token('admin', 'adm') })).json();
    assert.deepEqual(all.map(o => o.id).sort(), ['a', 'b']);
});

test('GET /orders?date=YYYY-MM-DD debe devolver solo los pedidos de esa fecha', async () => {
    db.orders = [{ id: 'a', delivery_date: '2099-03-03', delivery_timeSlot: '10:00' },
                 { id: 'b', delivery_date: '2099-03-04', delivery_timeSlot: '11:00' }];
    const res = await (await call('GET', '/orders?date=2099-03-03', { auth: token('admin') })).json();
    assert.deepEqual(res.map(o => o.id), ['a']);
});

test('GET /orders?start=..&end=.. debe devolver solo los pedidos del rango', async () => {
    db.orders = [{ id: 'a', delivery_date: '2099-03-03' }, { id: 'b', delivery_date: '2099-05-04' }];
    const res = await (await call('GET', '/orders?start=2099-03-01&end=2099-03-31', { auth: token('admin') })).json();
    assert.deepEqual(res.map(o => o.id), ['a']);
});

// ---------------------------------------------------------------- creación de pedido vs disponibilidad
test('un pedido en día y hora libres se crea correctamente', async () => {
    db.config = baseConfig();
    const res = await call('POST', '/orders', { body: newOrder('2099-03-03', '10:00') });
    assert.equal(res.status, 200);
    assert.equal(db.orders.length, 1);
    assert.equal(db.orders[0].delivery_timeSlot, '10:00');
});

test('el servidor debe rechazar un pedido para un día que el admin NO marcó como de reparto', async () => {
    db.config = baseConfig();
    const res = await call('POST', '/orders', { body: newOrder('2099-03-05', '10:00') });
    assert.ok(res.status >= 400 && res.status < 500, `se aceptó un día no configurado (status ${res.status})`);
});

test('el servidor debe rechazar una hora fuera de los tramos configurados para ese día de la semana', async () => {
    db.config = baseConfig();
    const res = await call('POST', '/orders', { body: newOrder('2099-03-03', '20:00') });
    assert.ok(res.status >= 400 && res.status < 500, `se aceptó una hora fuera de horario (status ${res.status})`);
});

test('el servidor debe rechazar una hora ya reservada o dentro de la zona de bloqueo (doble reserva)', async () => {
    db.config = baseConfig();
    db.orders = [{ id: 'previo', status: 'paid', delivery_date: '2099-03-03', delivery_timeSlot: '10:00' }];
    const same = await call('POST', '/orders', { body: newOrder('2099-03-03', '10:00') });
    assert.ok(same.status >= 400 && same.status < 500, `doble reserva aceptada (status ${same.status})`);
});


// ---------------------------------------------------------------- ocupación pública y reglas por proximidad
test('GET /orders/occupancy es pública, no expone datos personales y omite pedidos cancelados', async () => {
    db.orders = [
        { id: 'a', status: 'paid', customer_name: 'Ana', customer_email: 'ana@x.com', delivery_address: 'Secreta 1', delivery_date: '2099-03-03', delivery_timeSlot: '10:00', delivery_proximity: 'far' },
        { id: 'b', status: 'cancelled', delivery_date: '2099-03-03', delivery_timeSlot: '11:00' },
        { id: 'c', status: 'pending', delivery_date: '2099-03-04', delivery_timeSlot: '09:00' }
    ];
    const res = await call('GET', '/orders/occupancy?date=2099-03-03');
    assert.equal(res.status, 200);
    assert.deepEqual(await res.json(), [{ date: '2099-03-03', timeSlot: '10:00', proximity: 'far' }]);
    const range = await (await call('GET', '/orders/occupancy?start=2099-03-01&end=2099-03-31')).json();
    assert.equal(range.length, 2);
});

test('la zona de bloqueo de una reserva depende de SU proximidad (far bloquea más que near)', async () => {
    db.config = baseConfig();
    // near 60/30 reserva 10:00 -> bloquea 09:00..10:30 ; far 120/90 -> 09:00 (límite de tramo)..11:30
    db.orders = [{ id: 'p', status: 'paid', delivery_date: '2099-03-03', delivery_timeSlot: '10:00', delivery_proximity: 'near' }];
    assert.equal((await call('POST', '/orders', { body: newOrder('2099-03-03', '11:00') })).status, 200);
    db.orders = [{ id: 'p', status: 'paid', delivery_date: '2099-03-03', delivery_timeSlot: '10:00', delivery_proximity: 'far' }];
    assert.equal((await call('POST', '/orders', { body: newOrder('2099-03-03', '11:00', { id: 'otro' }) })).status, 409);
});

test('una reserva cancelada no bloquea y una reserva en otro día tampoco', async () => {
    db.config = { ...baseConfig(), deliveryDays: ['2099-03-03', '2099-03-10'] };
    db.orders = [
        { id: 'x', status: 'cancelled', delivery_date: '2099-03-03', delivery_timeSlot: '10:00' },
        { id: 'y', status: 'paid', delivery_date: '2099-03-10', delivery_timeSlot: '10:00' }
    ];
    assert.equal((await call('POST', '/orders', { body: newOrder('2099-03-03', '10:00') })).status, 200);
});

test('el propio pedido pendiente (mismo id) no se bloquea a sí mismo al reintentar', async () => {
    db.config = baseConfig();
    db.orders = [{ id: 'nuevo', status: 'pending', delivery_date: '2099-03-03', delivery_timeSlot: '10:00' }];
    const res = await call('POST', '/orders', { body: newOrder('2099-03-03', '10:00') });
    assert.equal(res.status, 200);
});

test('no se aceptan fechas pasadas ni pedidos sin configuración de disponibilidad', async () => {
    db.config = { ...baseConfig(), deliveryDays: ['2000-01-04'] };
    assert.ok((await call('POST', '/orders', { body: newOrder('2000-01-04', '10:00') })).status >= 400);
    db.config = null;
    assert.ok((await call('POST', '/orders', { body: newOrder('2099-03-03', '10:00') })).status >= 400);
});

// ---------------------------------------------------------------- radio, proximidad y recargo (bloque 3 del panel)
const check = () => checkDeliveryDistance({ address: 'C/ Uno 1', city: 'Madrid', zip: '28001' });

test('proximidad: los umbrales del panel clasifican cerca/media/lejos (límites incluidos en la zona inferior)', async () => {
    db.config = baseConfig();
    const cases = [[1, 'near'], [15, 'near'], [16, 'medium'], [30, 'medium'], [31, 'far'], [60, 'far']];
    for (const [minutes, expected] of cases) {
        route = { minutes, km: 10 };
        const r = await check();
        assert.equal(r.valid, true, `${minutes} min debería ser válido`);
        assert.equal(r.proximity, expected, `${minutes} min`);
    }
});

test('radio máximo: por encima de maxDeliveryMinutes se rechaza con too_far; en el límite se admite', async () => {
    db.config = baseConfig();
    route = { minutes: 60, km: 30 };
    assert.equal((await check()).valid, true);
    route = { minutes: 61, km: 30 };
    const r = await check();
    assert.equal(r.valid, false);
    assert.equal(r.reason, 'too_far');
    assert.equal(r.maxDeliveryMinutes, 60);
});

test('recargo: cerca = 0; media = importe fijo; lejos = €/km', async () => {
    db.config = baseConfig();
    route = { minutes: 10, km: 4 };  assert.equal((await check()).surchargeAmount, 0);
    route = { minutes: 20, km: 8 };  assert.equal((await check()).surchargeAmount, 3);
    route = { minutes: 45, km: 21 }; assert.equal((await check()).surchargeAmount, 10.5);
});

test('el total del pedido incluye el recargo calculado en servidor', async () => {
    db.config = baseConfig();
    route = { minutes: 20, km: 8 }; // media, +3 €
    const res = await call('POST', '/orders', { body: newOrder('2099-03-03', '10:00', { total: 20 }) });
    assert.equal(res.status, 200);
    assert.equal(db.orders[0].total, 23);
    assert.equal(db.orders[0].delivery_proximity, 'medium');
});

test('un pedido fuera del radio se rechaza con 422 y no se guarda', async () => {
    db.config = baseConfig();
    route = { minutes: 90, km: 80 };
    const res = await call('POST', '/orders', { body: newOrder('2099-03-03', '10:00') });
    assert.equal(res.status, 422);
    assert.equal(db.orders.length, 0);
});

test('dirección inexistente: se rechaza con address_not_found', async () => {
    db.config = baseConfig();
    geocodeOk = false;
    const r = await check();
    assert.deepEqual([r.valid, r.reason], [false, 'address_not_found']);
});

test('sin dirección de origen configurada no se bloquea al cliente (fail-open)', async () => {
    db.config = { ...baseConfig(), originAddress: '' };
    const r = await check();
    assert.deepEqual([r.valid, r.checked], [true, false]);
});

test('configuración antigua sin umbrales/recargos usa los valores por defecto', async () => {
    db.config = { originAddress: 'Origen', deliveryDays: [] };
    route = { minutes: 20, km: 8 };
    const r = await check();
    assert.deepEqual([r.valid, r.proximity, r.surchargeAmount], [true, 'medium', 0]);
});

// ---------------------------------------------------------------- concurrencia y retención
test('concurrencia: 15 clientes reservando a la vez la misma hora → solo uno lo consigue', async () => {
    db.config = baseConfig();
    const results = await Promise.all(Array.from({ length: 15 }, (_, i) =>
        call('POST', '/orders', { body: newOrder('2099-03-03', '10:00', { id: `c${i}` }) })));
    const statuses = results.map(r => r.status).sort();
    assert.equal(statuses.filter(s => s === 200).length, 1, `estados: ${statuses}`);
    assert.equal(statuses.filter(s => s === 409).length, 14);
    assert.equal(db.orders.length, 1);
});

test('concurrencia: horas que se bloquean entre sí (10:00 y 10:30, regla near 60/30) tampoco pueden coexistir', async () => {
    db.config = baseConfig();
    const rs = await Promise.all(['10:00', '10:30'].map((t, i) => call('POST', '/orders', { body: newOrder('2099-03-03', t, { id: `z${i}` }) })));
    assert.deepEqual(rs.map(r => r.status).sort(), [200, 409]);
});

test('concurrencia: reservas simultáneas de horas compatibles se aceptan todas', async () => {
    db.config = baseConfig();
    const times = ['09:00', '11:00', '12:30'];
    const rs = await Promise.all(times.map((t, i) => call('POST', '/orders', { body: newOrder('2099-03-03', t, { id: `k${i}` }) })));
    assert.deepEqual(rs.map(r => r.status), [200, 200, 200]);
});

test('concurrencia: reservas simultáneas de días distintos no se bloquean entre sí', async () => {
    db.config = { ...baseConfig(), deliveryDays: ['2099-03-03', '2099-03-10'] };
    const rs = await Promise.all(['2099-03-03', '2099-03-10'].map((d, i) => call('POST', '/orders', { body: newOrder(d, '10:00', { id: `d${i}` }) })));
    assert.deepEqual(rs.map(r => r.status), [200, 200]);
});

test('retención 10 min: un pedido sin pagar de hace 9 min bloquea la hora; de hace 11 min ya no', async () => {
    db.config = baseConfig();
    const ago = (min) => new Date(Date.now() - min * 60000);
    db.orders = [{ id: 'p', status: 'pending', delivery_date: '2099-03-03', delivery_timeSlot: '10:00', createdAt: ago(9) }];
    assert.equal((await call('POST', '/orders', { body: newOrder('2099-03-03', '10:00') })).status, 409);
    db.orders = [{ id: 'p', status: 'pending', delivery_date: '2099-03-03', delivery_timeSlot: '10:00', createdAt: ago(11) }];
    assert.equal((await call('POST', '/orders', { body: newOrder('2099-03-03', '10:00') })).status, 200);
});

test('retención: un pedido pagado bloquea la hora aunque sea antiguo; uno "failed" caduca como el pendiente', async () => {
    db.config = baseConfig();
    const old = new Date(Date.now() - 3 * 3600000);
    db.orders = [{ id: 'p', status: 'paid', delivery_date: '2099-03-03', delivery_timeSlot: '10:00', createdAt: old }];
    assert.equal((await call('POST', '/orders', { body: newOrder('2099-03-03', '10:00') })).status, 409);
    db.orders = [{ id: 'p', status: 'failed', delivery_date: '2099-03-03', delivery_timeSlot: '10:00', createdAt: old }];
    assert.equal((await call('POST', '/orders', { body: newOrder('2099-03-03', '10:00') })).status, 200);
});

test('retención: /orders/occupancy no lista los pedidos sin pagar caducados', async () => {
    db.orders = [
        { id: 'a', status: 'pending', delivery_date: '2099-03-03', delivery_timeSlot: '10:00', createdAt: new Date() },
        { id: 'b', status: 'pending', delivery_date: '2099-03-03', delivery_timeSlot: '12:00', createdAt: new Date(Date.now() - 11 * 60000) }
    ];
    const res = await (await call('GET', '/orders/occupancy?date=2099-03-03')).json();
    assert.deepEqual(res.map(o => o.timeSlot), ['10:00']);
});

test('si Google Geocoding falla por facturación/clave (REQUEST_DENIED) NO se bloquea al cliente: se acepta sin comprobar (fail-open)', async () => {
    db.config = baseConfig();
    const original = axios.get;
    axios.get = async () => ({ data: { status: 'REQUEST_DENIED', error_message: 'You must enable Billing' } });
    try {
        const r = await check();
        assert.deepEqual([r.valid, r.checked, r.reason], [true, false, 'geocode_unavailable']);
        const res = await call('POST', '/orders', { body: newOrder('2099-03-03', '10:00') });
        assert.equal(res.status, 200);
    } finally { axios.get = original; }
});

test('una dirección que Google no encuentra (ZERO_RESULTS) sigue rechazándose como address_not_found', async () => {
    db.config = baseConfig();
    geocodeOk = false;
    const r = await check();
    assert.deepEqual([r.valid, r.reason], [false, 'address_not_found']);
});
