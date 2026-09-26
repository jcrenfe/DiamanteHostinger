// Disponibilidad de entrega, radio de reparto y concurrencia de reservas.
// Aplicación completa y base de datos real de pruebas; Google Maps, Stripe y el correo van simulados.
require('./helpers/env');
const { src, maps, resetStubs } = require('./helpers/stubs');
const db = require('./helpers/db');

const test = require('node:test');
const assert = require('node:assert/strict');
const jwt = require('jsonwebtoken');

const { checkDeliveryDistance } = require(src('services', 'deliveryDistance.js'));
const app = require(src('app.js'));

// Resultado fijo del Geocoding: Google entiende "Calle Uno 1, 28001 Madrid" sea cual sea lo escrito
// (así se prueban las correcciones de erratas y de código postal).
const GOOGLE_ADDRESS = {
    formatted_address: 'C. Uno, 1, 28001 Madrid, España',
    types: ['street_address'],
    address_components: [
        { long_name: '1', types: ['street_number'] },
        { long_name: 'Calle Uno', types: ['route'] },
        { long_name: 'Madrid', types: ['locality'] },
        { long_name: '28001', types: ['postal_code'] }
    ],
    geometry: { location: { lat: 1, lng: 1 } }
};

let server; let base;
test.before(async () => {
    await new Promise(r => { server = app.listen(0, r); });
    base = `http://127.0.0.1:${server.address().port}/api`;
});
test.after(async () => { server.close(); await db.client.$disconnect(); });
test.beforeEach(async () => {
    resetStubs();
    maps.geocodeResult = GOOGLE_ADDRESS;
    maps.route = { minutes: 10, km: 5 };
    await db.reset();
});

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
const setOrders = (rows) => db.insertOrders(rows);
const ago = (min) => new Date(Date.now() - min * 60000);

// ---------------------------------------------------------------- config guardada
test('la configuración guardada por el panel se devuelve idéntica al cliente', async () => {
    const cfg = baseConfig();
    const save = await call('POST', '/config/appointment', { body: cfg, auth: token('admin') });
    assert.equal(save.status, 200);
    const res = await call('GET', '/config/appointment');
    assert.deepEqual(await res.json(), cfg);
});

test('guardar la configuración de nuevo la sustituye entera (no se mezclan claves antiguas)', async () => {
    await call('POST', '/config/appointment', { body: { ...baseConfig(), extra: 1 }, auth: token('admin') });
    await call('POST', '/config/appointment', { body: baseConfig(), auth: token('admin') });
    assert.deepEqual(await (await call('GET', '/config/appointment')).json(), baseConfig());
});

test('sin configuración guardada el endpoint responde 404 (el frontend usa valores por defecto)', async () => {
    assert.equal((await call('GET', '/config/appointment')).status, 404);
});

test('solo un administrador autenticado debe poder modificar la disponibilidad', async () => {
    const anon = await call('POST', '/config/appointment', { body: baseConfig() });
    assert.ok([401, 403].includes(anon.status), `un anónimo pudo guardar la configuración (status ${anon.status})`);
    const customer = await call('POST', '/config/appointment', { body: baseConfig(), auth: token('cliente') });
    assert.ok([401, 403].includes(customer.status), `un cliente pudo guardar la configuración (status ${customer.status})`);
    assert.equal((await call('GET', '/config/appointment')).status, 404);
});

// ---------------------------------------------------------------- lectura de pedidos
test('GET /orders exige token: sin sesión responde 401', async () => {
    assert.equal((await call('GET', '/orders')).status, 401);
});

test('GET /orders: un cliente solo recibe sus propios pedidos; el admin recibe todos', async () => {
    await setOrders([{ id: 'a', customer_uid: 'u1', delivery_date: '2099-03-03', delivery_timeSlot: '10:00' },
                     { id: 'b', customer_uid: 'u2', delivery_date: '2099-03-03', delivery_timeSlot: '11:00' }]);
    const mine = await (await call('GET', '/orders', { auth: token('cliente', 'u1') })).json();
    assert.deepEqual(mine.map(o => o.id), ['a']);
    const all = await (await call('GET', '/orders', { auth: token('admin', 'adm') })).json();
    assert.deepEqual(all.map(o => o.id).sort(), ['a', 'b']);
});

test('GET /orders: un token sin uid no devuelve pedidos de nadie', async () => {
    await setOrders([{ id: 'a', customer_uid: 'u1' }, { id: 'b' }]);
    const noUid = jwt.sign({ role: 'cliente', email: 'x@x.com' }, process.env.JWT_SECRET);
    assert.deepEqual(await (await call('GET', '/orders', { auth: noUid })).json(), []);
});

test('GET /orders: más recientes primero', async () => {
    await setOrders([{ id: 'viejo', createdAt: ago(60) }, { id: 'nuevo', createdAt: ago(1) }, { id: 'medio', createdAt: ago(30) }]);
    const all = await (await call('GET', '/orders', { auth: token('admin', 'adm') })).json();
    assert.deepEqual(all.map(o => o.id), ['nuevo', 'medio', 'viejo']);
});

test('GET /orders?date=YYYY-MM-DD debe devolver solo los pedidos de esa fecha', async () => {
    await setOrders([{ id: 'a', delivery_date: '2099-03-03', delivery_timeSlot: '10:00' },
                     { id: 'b', delivery_date: '2099-03-04', delivery_timeSlot: '11:00' }]);
    const res = await (await call('GET', '/orders?date=2099-03-03', { auth: token('admin') })).json();
    assert.deepEqual(res.map(o => o.id), ['a']);
});

test('GET /orders?start=..&end=.. debe devolver solo los pedidos del rango', async () => {
    await setOrders([{ id: 'a', delivery_date: '2099-03-03' }, { id: 'b', delivery_date: '2099-05-04' }]);
    const res = await (await call('GET', '/orders?start=2099-03-01&end=2099-03-31', { auth: token('admin') })).json();
    assert.deepEqual(res.map(o => o.id), ['a']);
});

test('GET /orders/:id: el dueño y el admin lo ven con sus líneas; otro cliente no; inexistente 404', async () => {
    await setOrders([{ id: 'a', customer_uid: 'u1', items: [{ name: 'X', price: 3, quantity: 2 }] }]);
    const own = await call('GET', '/orders/a', { auth: token('cliente', 'u1') });
    assert.equal(own.status, 200);
    assert.deepEqual((await own.json()).items.map(i => [i.name, i.price, i.quantity]), [['X', 3, 2]]);
    assert.equal((await call('GET', '/orders/a', { auth: token('admin', 'adm') })).status, 200);
    assert.equal((await call('GET', '/orders/a', { auth: token('cliente', 'u2') })).status, 403);
    assert.equal((await call('GET', '/orders/nope', { auth: token('admin', 'adm') })).status, 404);
});

test('PUT /orders/:id/status: solo admin, estado válido y pedido existente', async () => {
    await setOrders([{ id: 'a', status: 'paid' }]);
    assert.equal((await call('PUT', '/orders/a/status', { body: { status: 'delivered' } })).status, 401);
    assert.equal((await call('PUT', '/orders/a/status', { body: { status: 'delivered' }, auth: token('cliente') })).status, 403);
    assert.equal((await call('PUT', '/orders/a/status', { body: { status: 'inventado' }, auth: token('admin') })).status, 400);
    assert.equal((await call('PUT', '/orders/nope/status', { body: { status: 'delivered' }, auth: token('admin') })).status, 404);
    const ok = await call('PUT', '/orders/a/status', { body: { status: 'delivered' }, auth: token('admin') });
    assert.equal(ok.status, 200);
    assert.equal((await db.order('a')).status, 'delivered');
});

// ---------------------------------------------------------------- creación de pedido vs disponibilidad
test('un pedido en día y hora libres se crea correctamente', async () => {
    await db.setConfig(baseConfig());
    const res = await call('POST', '/orders', { body: newOrder('2099-03-03', '10:00') });
    assert.equal(res.status, 200);
    const all = await db.orders();
    assert.equal(all.length, 1);
    assert.equal(all[0].delivery_timeSlot, '10:00');
    assert.equal(all[0].status, 'pending');
});

test('un pedido nuevo siempre nace pendiente aunque el cliente envíe otro estado', async () => {
    await db.setConfig(baseConfig());
    await call('POST', '/orders', { body: newOrder('2099-03-03', '10:00', { status: 'paid' }) });
    assert.equal((await db.order('nuevo')).status, 'pending');
});

test('un pedido con datos obligatorios ausentes se rechaza con 400 y no se guarda', async () => {
    await db.setConfig(baseConfig());
    const body = newOrder('2099-03-03', '10:00');
    delete body.customer.name;
    assert.equal((await call('POST', '/orders', { body })).status, 400);
    assert.equal((await db.orders()).length, 0);
});

test('el servidor debe rechazar un pedido para un día que el admin NO marcó como de reparto', async () => {
    await db.setConfig(baseConfig());
    const res = await call('POST', '/orders', { body: newOrder('2099-03-05', '10:00') });
    assert.ok(res.status >= 400 && res.status < 500, `se aceptó un día no configurado (status ${res.status})`);
});

test('el servidor debe rechazar una hora fuera de los tramos configurados para ese día de la semana', async () => {
    await db.setConfig(baseConfig());
    const res = await call('POST', '/orders', { body: newOrder('2099-03-03', '20:00') });
    assert.ok(res.status >= 400 && res.status < 500, `se aceptó una hora fuera de horario (status ${res.status})`);
});

test('el servidor debe rechazar una hora ya reservada o dentro de la zona de bloqueo (doble reserva)', async () => {
    await db.setConfig(baseConfig());
    await setOrders([{ id: 'previo', status: 'paid', delivery_date: '2099-03-03', delivery_timeSlot: '10:00' }]);
    const same = await call('POST', '/orders', { body: newOrder('2099-03-03', '10:00') });
    assert.ok(same.status >= 400 && same.status < 500, `doble reserva aceptada (status ${same.status})`);
});

test('un número de pedido repetido de otro pedido se rechaza con 409', async () => {
    await db.setConfig(baseConfig());
    await setOrders([{ id: 'nuevo', status: 'paid', delivery_date: '2099-03-03', delivery_timeSlot: '12:30' }]);
    assert.equal((await call('POST', '/orders', { body: newOrder('2099-03-03', '10:00') })).status, 409);
});

// ---------------------------------------------------------------- ocupación pública y reglas por proximidad
test('GET /orders/occupancy es pública, no expone datos personales y omite pedidos cancelados', async () => {
    await setOrders([
        { id: 'a', status: 'paid', customer_name: 'Ana', customer_email: 'ana@x.com', delivery_address: 'Secreta 1', delivery_date: '2099-03-03', delivery_timeSlot: '10:00', delivery_proximity: 'far' },
        { id: 'b', status: 'cancelled', delivery_date: '2099-03-03', delivery_timeSlot: '11:00' },
        { id: 'c', status: 'pending', delivery_date: '2099-03-04', delivery_timeSlot: '09:00' }
    ]);
    const res = await call('GET', '/orders/occupancy?date=2099-03-03');
    assert.equal(res.status, 200);
    assert.deepEqual(await res.json(), [{ date: '2099-03-03', timeSlot: '10:00', proximity: 'far' }]);
    const range = await (await call('GET', '/orders/occupancy?start=2099-03-01&end=2099-03-31')).json();
    assert.equal(range.length, 2);
});

test('la zona de bloqueo de una reserva depende de SU proximidad (far bloquea más que near)', async () => {
    await db.setConfig(baseConfig());
    // near 60/30 reserva 10:00 -> bloquea 09:00..10:30 ; far 120/90 -> 09:00 (límite de tramo)..11:30
    await setOrders([{ id: 'p', status: 'paid', delivery_date: '2099-03-03', delivery_timeSlot: '10:00', delivery_proximity: 'near' }]);
    assert.equal((await call('POST', '/orders', { body: newOrder('2099-03-03', '11:00') })).status, 200);
    await db.reset(); await db.setConfig(baseConfig());
    await setOrders([{ id: 'p', status: 'paid', delivery_date: '2099-03-03', delivery_timeSlot: '10:00', delivery_proximity: 'far' }]);
    assert.equal((await call('POST', '/orders', { body: newOrder('2099-03-03', '11:00', { id: 'otro' }) })).status, 409);
});

test('una reserva cancelada no bloquea y una reserva en otro día tampoco', async () => {
    await db.setConfig({ ...baseConfig(), deliveryDays: ['2099-03-03', '2099-03-10'] });
    await setOrders([
        { id: 'x', status: 'cancelled', delivery_date: '2099-03-03', delivery_timeSlot: '10:00' },
        { id: 'y', status: 'paid', delivery_date: '2099-03-10', delivery_timeSlot: '10:00' }
    ]);
    assert.equal((await call('POST', '/orders', { body: newOrder('2099-03-03', '10:00') })).status, 200);
});

test('el propio pedido pendiente (mismo id) no se bloquea a sí mismo al reintentar', async () => {
    await db.setConfig(baseConfig());
    await setOrders([{ id: 'nuevo', status: 'pending', delivery_date: '2099-03-03', delivery_timeSlot: '10:00' }]);
    const res = await call('POST', '/orders', { body: newOrder('2099-03-03', '10:00') });
    // Pasa la comprobación de disponibilidad; como el número ya existe, el alta se rechaza sin duplicarlo.
    assert.equal(res.status, 409);
    assert.equal((await db.orders()).length, 1);
});

test('no se aceptan fechas pasadas ni pedidos sin configuración de disponibilidad', async () => {
    await db.setConfig({ ...baseConfig(), deliveryDays: ['2000-01-04'] });
    assert.ok((await call('POST', '/orders', { body: newOrder('2000-01-04', '10:00') })).status >= 400);
    await db.setConfig(null);
    assert.ok((await call('POST', '/orders', { body: newOrder('2099-03-03', '10:00') })).status >= 400);
});

// ---------------------------------------------------------------- radio, proximidad y recargo (bloque 3 del panel)
const check = () => checkDeliveryDistance({ address: 'C/ Uno 1', city: 'Madrid', zip: '28001' });

test('proximidad: los umbrales del panel clasifican cerca/media/lejos (límites incluidos en la zona inferior)', async () => {
    await db.setConfig(baseConfig());
    const cases = [[1, 'near'], [15, 'near'], [16, 'medium'], [30, 'medium'], [31, 'far'], [60, 'far']];
    for (const [minutes, expected] of cases) {
        maps.route = { minutes, km: 10 };
        const r = await check();
        assert.equal(r.valid, true, `${minutes} min debería ser válido`);
        assert.equal(r.proximity, expected, `${minutes} min`);
    }
});

test('radio máximo: por encima de maxDeliveryMinutes se rechaza con too_far; en el límite se admite', async () => {
    await db.setConfig(baseConfig());
    maps.route = { minutes: 60, km: 30 };
    assert.equal((await check()).valid, true);
    maps.route = { minutes: 61, km: 30 };
    const r = await check();
    assert.equal(r.valid, false);
    assert.equal(r.reason, 'too_far');
    assert.equal(r.maxDeliveryMinutes, 60);
});

test('recargo: cerca = 0; media = importe fijo; lejos = €/km', async () => {
    await db.setConfig(baseConfig());
    maps.route = { minutes: 10, km: 4 };  assert.equal((await check()).surchargeAmount, 0);
    maps.route = { minutes: 20, km: 8 };  assert.equal((await check()).surchargeAmount, 3);
    maps.route = { minutes: 45, km: 21 }; assert.equal((await check()).surchargeAmount, 10.5);
});

test('el total del pedido incluye el recargo calculado en servidor', async () => {
    await db.setConfig(baseConfig());
    maps.route = { minutes: 20, km: 8 }; // media, +3 €
    const res = await call('POST', '/orders', { body: newOrder('2099-03-03', '10:00', { total: 20 }) });
    assert.equal(res.status, 200);
    const o = (await db.orders())[0];
    assert.equal(o.total, 23);
    assert.equal(o.delivery_proximity, 'medium');
    assert.equal(o.delivery_surchargeAmount, 3);
    assert.equal(o.delivery_durationMin, 20);
    assert.equal(o.delivery_distanceKm, 8);
});

test('un pedido fuera del radio se rechaza con 422 y no se guarda', async () => {
    await db.setConfig(baseConfig());
    maps.route = { minutes: 90, km: 80 };
    const res = await call('POST', '/orders', { body: newOrder('2099-03-03', '10:00') });
    assert.equal(res.status, 422);
    assert.equal((await db.orders()).length, 0);
});

test('dirección inexistente: se rechaza con address_not_found', async () => {
    await db.setConfig(baseConfig());
    maps.geocodeStatus = 'ZERO_RESULTS';
    const r = await check();
    assert.deepEqual([r.valid, r.reason], [false, 'address_not_found']);
});

test('calle inventada: Google solo localiza la ciudad/CP y se rechaza con address_not_found', async () => {
    await db.setConfig(baseConfig());
    maps.geocodeResult = { ...GOOGLE_ADDRESS, types: ['postal_code'], partial_match: true, address_components: [{ long_name: '28001', types: ['postal_code'] }] };
    const r = await check();
    assert.deepEqual([r.valid, r.reason], [false, 'address_not_found']);
});

test('dirección que Google devuelve igual que la escrita: se muestra normalizada y sin aviso de corrección', async () => {
    await db.setConfig(baseConfig());
    const r = await check();
    assert.deepEqual([r.valid, r.formattedAddress, r.addressCorrected], [true, 'C. Uno, 1, 28001 Madrid, España', false]);
});

test('errata en la calle que Google corrige ("Calle Un" → "Calle Uno"): se acepta y se avisa de la corrección', async () => {
    await db.setConfig(baseConfig());
    const r = await checkDeliveryDistance({ address: 'Calle Un 1', city: 'Madrid', zip: '28001' });
    assert.deepEqual([r.valid, r.addressCorrected], [true, true]);
});

test('el pedido guarda la dirección corregida por Google y conserva la que escribió el cliente', async () => {
    await db.setConfig(baseConfig());
    const body = newOrder('2099-03-03', '10:00');
    body.delivery = { ...body.delivery, address: 'Calle Un 1', city: 'Madrid', zip: '09001', addressExtra: '  2º B  ' };
    const res = await call('POST', '/orders', { body });
    assert.equal(res.status, 200);
    const o = (await db.orders())[0];
    assert.deepEqual([o.delivery_address, o.delivery_city, o.delivery_zip], ['Calle Uno, 1', 'Madrid', '28001']);
    assert.equal(o.delivery_addressOriginal, 'Calle Un 1, 09001, Madrid');
    assert.equal(o.delivery_addressExtra, '2º B');
});

test('si Google no corrige nada no se guarda dirección original', async () => {
    await db.setConfig(baseConfig());
    const res = await call('POST', '/orders', { body: newOrder('2099-03-03', '10:00') });
    assert.equal(res.status, 200);
    const o = (await db.orders())[0];
    assert.equal(o.delivery_addressOriginal, null);
    assert.equal(o.delivery_addressExtra, null);
});

test('código postal equivocado que Google cambia: se acepta y se avisa de la corrección', async () => {
    await db.setConfig(baseConfig());
    const r = await checkDeliveryDistance({ address: 'C/ Uno 1', city: 'Madrid', zip: '09001' });
    assert.deepEqual([r.valid, r.addressCorrected], [true, true]);
});

test('abreviar el tipo de vía ("Cl." en lugar de "Calle") no cuenta como corrección', async () => {
    await db.setConfig(baseConfig());
    const r = await checkDeliveryDistance({ address: 'Cl. Uno, 1', city: 'madrid', zip: '28001' });
    assert.equal(r.addressCorrected, false);
});

test('sin dirección de origen configurada la dirección se verifica igualmente (sin radio que aplicar)', async () => {
    await db.setConfig({ ...baseConfig(), originAddress: '' });
    const r = await check();
    assert.deepEqual([r.valid, r.checked, r.reason], [true, true, 'no_origin_configured']);
});

test('dirección sin número de portal (Google devuelve solo la calle): se rechaza como incompleta', async () => {
    await db.setConfig(baseConfig());
    maps.geocodeResult = { ...GOOGLE_ADDRESS, types: ['route'], address_components: GOOGLE_ADDRESS.address_components.filter(c => !c.types.includes('street_number')) };
    const r = await check();
    assert.deepEqual([r.valid, r.reason], [false, 'address_not_found']);
});

test('configuración antigua sin umbrales/recargos usa los valores por defecto', async () => {
    await db.setConfig({ originAddress: 'Origen', deliveryDays: [] });
    maps.route = { minutes: 20, km: 8 };
    const r = await check();
    assert.deepEqual([r.valid, r.proximity, r.surchargeAmount], [true, 'medium', 0]);
});

// ---------------------------------------------------------------- concurrencia y retención
test('concurrencia: 15 clientes reservando a la vez la misma hora → solo uno lo consigue', async () => {
    await db.setConfig(baseConfig());
    const results = await Promise.all(Array.from({ length: 15 }, (_, i) =>
        call('POST', '/orders', { body: newOrder('2099-03-03', '10:00', { id: `c${i}` }) })));
    const statuses = results.map(r => r.status).sort();
    assert.equal(statuses.filter(s => s === 200).length, 1, `estados: ${statuses}`);
    assert.equal(statuses.filter(s => s === 409).length, 14);
    assert.equal((await db.orders()).length, 1);
});

test('concurrencia: horas que se bloquean entre sí (10:00 y 10:30, regla near 60/30) tampoco pueden coexistir', async () => {
    await db.setConfig(baseConfig());
    const rs = await Promise.all(['10:00', '10:30'].map((t, i) => call('POST', '/orders', { body: newOrder('2099-03-03', t, { id: `z${i}` }) })));
    assert.deepEqual(rs.map(r => r.status).sort(), [200, 409]);
});

test('concurrencia: reservas simultáneas de horas compatibles se aceptan todas', async () => {
    await db.setConfig(baseConfig());
    const times = ['09:00', '11:00', '12:30'];
    const rs = await Promise.all(times.map((t, i) => call('POST', '/orders', { body: newOrder('2099-03-03', t, { id: `k${i}` }) })));
    assert.deepEqual(rs.map(r => r.status), [200, 200, 200]);
});

test('concurrencia: reservas simultáneas de días distintos no se bloquean entre sí', async () => {
    await db.setConfig({ ...baseConfig(), deliveryDays: ['2099-03-03', '2099-03-10'] });
    const rs = await Promise.all(['2099-03-03', '2099-03-10'].map((d, i) => call('POST', '/orders', { body: newOrder(d, '10:00', { id: `d${i}` }) })));
    assert.deepEqual(rs.map(r => r.status), [200, 200]);
});

test('retención 10 min: un pedido sin pagar de hace 9 min bloquea la hora; de hace 11 min ya no', async () => {
    await db.setConfig(baseConfig());
    await setOrders([{ id: 'p', status: 'pending', delivery_date: '2099-03-03', delivery_timeSlot: '10:00', createdAt: ago(9) }]);
    assert.equal((await call('POST', '/orders', { body: newOrder('2099-03-03', '10:00') })).status, 409);
    await db.reset(); await db.setConfig(baseConfig());
    await setOrders([{ id: 'p', status: 'pending', delivery_date: '2099-03-03', delivery_timeSlot: '10:00', createdAt: ago(11) }]);
    assert.equal((await call('POST', '/orders', { body: newOrder('2099-03-03', '10:00') })).status, 200);
});

test('retención: un pedido pagado bloquea la hora aunque sea antiguo; uno "failed" caduca como el pendiente', async () => {
    await db.setConfig(baseConfig());
    const old = new Date(Date.now() - 3 * 3600000);
    await setOrders([{ id: 'p', status: 'paid', delivery_date: '2099-03-03', delivery_timeSlot: '10:00', createdAt: old }]);
    assert.equal((await call('POST', '/orders', { body: newOrder('2099-03-03', '10:00') })).status, 409);
    await db.reset(); await db.setConfig(baseConfig());
    await setOrders([{ id: 'p', status: 'failed', delivery_date: '2099-03-03', delivery_timeSlot: '10:00', createdAt: old }]);
    assert.equal((await call('POST', '/orders', { body: newOrder('2099-03-03', '10:00') })).status, 200);
});

test('retención: /orders/occupancy no lista los pedidos sin pagar caducados', async () => {
    await setOrders([
        { id: 'a', status: 'pending', delivery_date: '2099-03-03', delivery_timeSlot: '10:00', createdAt: new Date() },
        { id: 'b', status: 'pending', delivery_date: '2099-03-03', delivery_timeSlot: '12:00', createdAt: ago(11) }
    ]);
    const res = await (await call('GET', '/orders/occupancy?date=2099-03-03')).json();
    assert.deepEqual(res.map(o => o.timeSlot), ['10:00']);
});

test('si el Geocoding de Google falla (REQUEST_DENIED) el pedido NO se acepta: la dirección no se puede verificar (fail-closed)', async () => {
    await db.setConfig(baseConfig());
    maps.geocodeStatus = 'REQUEST_DENIED';
    const r = await check();
    assert.deepEqual([r.valid, r.checked, r.reason], [false, false, 'check_unavailable']);
    const res = await call('POST', '/orders', { body: newOrder('2099-03-03', '10:00') });
    assert.equal(res.status, 422);
    assert.equal((await db.orders()).length, 0);
});

test('si la Routes API falla el pedido tampoco se acepta', async () => {
    await db.setConfig(baseConfig());
    maps.routeFails = true;
    const res = await call('POST', '/orders', { body: newOrder('2099-03-03', '10:00') });
    assert.equal(res.status, 422);
    assert.equal((await db.orders()).length, 0);
});

// ---------------------------------------------------------------- Mis pedidos: líneas y propiedad
test('al crear un pedido se guardan sus líneas y el pedido las devuelve al listarlo', async () => {
    await db.setConfig(baseConfig());
    await db.ensureUser('u1');
    const items = [{ product: { id: 'p1', name: 'DESAYUNO CON DIAMANTES', price: 35 }, quantity: 2 }, { product: { id: 'p2', name: 'GLOBO ADICIONAL', price: 5.5 }, quantity: 1 }];
    const res = await call('POST', '/orders', { body: newOrder('2099-03-03', '10:00', { items }), auth: token('cliente', 'u1') });
    assert.equal(res.status, 200);
    assert.equal((await db.items()).length, 2);
    const list = await (await call('GET', '/orders?mine=1', { auth: token('cliente', 'u1') })).json();
    assert.equal(list.length, 1);
    assert.deepEqual(list[0].items.map(i => [i.name, i.quantity, i.price]), [['DESAYUNO CON DIAMANTES', 2, 35], ['GLOBO ADICIONAL', 1, 5.5]]);
});

test('el pedido y sus líneas se guardan juntos: si una línea no es válida no queda nada guardado', async () => {
    await db.setConfig(baseConfig());
    // La segunda línea no cabe en su columna (productId VARCHAR(191)): la base la rechaza al insertarla,
    // después del pedido, y la transacción debe deshacerlo todo.
    const items = [{ product: { id: 'p1', name: 'A', price: 35 }, quantity: 1 }, { product: { id: 'x'.repeat(300), name: 'B', price: 5 }, quantity: 1 }];
    const res = await call('POST', '/orders', { body: newOrder('2099-03-03', '10:00', { items }) });
    assert.ok(res.status >= 400, `status ${res.status}`);
    assert.equal((await db.orders()).length, 0);
    assert.equal((await db.items()).length, 0);
});

test('el pedido queda asociado al usuario del TOKEN, no al uid que diga el cuerpo de la petición', async () => {
    await db.setConfig(baseConfig());
    await db.ensureUser('u1');
    await call('POST', '/orders', { body: newOrder('2099-03-03', '10:00', { customer: { uid: 'otra-persona', name: 'A', email: 'a@a.com', phone: '600000000' } }), auth: token('cliente', 'u1') });
    assert.equal((await db.orders())[0].customer_uid, 'u1');
});

test('un pedido de invitado (sin token) se guarda sin usuario', async () => {
    await db.setConfig(baseConfig());
    await call('POST', '/orders', { body: newOrder('2099-03-03', '10:00') });
    assert.equal((await db.orders())[0].customer_uid, null);
});

test('GET /orders?mine=1: un administrador recibe solo sus pedidos; sin mine recibe todos', async () => {
    await setOrders([{ id: 'a', customer_uid: 'adm', delivery_date: '2099-03-03' }, { id: 'b', customer_uid: 'u2', delivery_date: '2099-03-03' }]);
    const mine = await (await call('GET', '/orders?mine=1', { auth: token('admin', 'adm') })).json();
    assert.deepEqual(mine.map(o => o.id), ['a']);
    const all = await (await call('GET', '/orders', { auth: token('admin', 'adm') })).json();
    assert.deepEqual(all.map(o => o.id).sort(), ['a', 'b']);
});
