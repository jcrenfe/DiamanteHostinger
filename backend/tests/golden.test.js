// Prueba de regresión de la migración a Prisma: recorre todos los endpoints que usan la base de datos
// sobre unos datos fijos y compara cada respuesta, y el estado final de las tablas, con la referencia
// guardada en tests/__snapshots__/golden.json.
//   UPDATE_SNAPSHOTS=1 npm test   → regenera la referencia (solo cuando un cambio de comportamiento es intencionado)
require('./helpers/env');
const { src, maps, signWebhook, resetStubs } = require('./helpers/stubs');
const db = require('./helpers/db');

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

const app = require(src('app.js'));
const SNAPSHOT = path.join(__dirname, '__snapshots__', 'golden.json');

const token = (role, uid) => jwt.sign({ uid, role, email: `${uid}@x.com` }, process.env.JWT_SECRET);
const ADMIN = token('admin', 'admin1');
const ANA = token('cliente', 'ana');
const LUIS = token('cliente', 'luis');

// ---------------------------------------------------------------- normalización
const ISO = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z$/;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function normalize(value, key = '') {
    if (value instanceof Date) return '<fecha>';
    if (Array.isArray(value)) return value.map(v => normalize(v));
    if (value && typeof value === 'object') {
        const out = {};
        for (const k of Object.keys(value).sort()) out[k] = normalize(value[k], k);
        return out;
    }
    if (typeof value === 'bigint') return Number(value);
    if (typeof value === 'string') {
        if (ISO.test(value)) return '<fecha>';
        if (UUID.test(value)) return '<uuid>';
        if (key === 'token' || /^eyJ/.test(value)) return '<jwt>';
        if (/^\$2[aby]\$/.test(value)) return '<hash>';
    }
    return value;
}

// ---------------------------------------------------------------- datos fijos
const config = {
    deliveryDays: ['2099-03-03', '2099-03-04'],
    dailySlots: { 2: [{ start: '09:00', end: '13:00' }], 3: [{ start: '09:00', end: '13:00' }] },
    blockingRules: { near: { beforeMinutes: 60, afterMinutes: 30 }, medium: { beforeMinutes: 90, afterMinutes: 60 }, far: { beforeMinutes: 120, afterMinutes: 90 } },
    originAddress: 'Calle Origen 1, Madrid',
    proximityThresholds: { nearMaxMinutes: 15, mediumMaxMinutes: 30 },
    maxDeliveryMinutes: 60,
    deliverySurcharges: { medium: { type: 'fixed', amount: 3 }, far: { type: 'perKm', amount: 0.5 } }
};
const at = (min) => new Date(Date.now() - min * 60000);

async function seed() {
    await db.reset();
    await db.setConfig(config);
    const hash = await bcrypt.hash('secreto123', 4);
    await db.client.user.create({ data: { uid: 'admin1', email: 'admin@x.com', displayName: 'Admin', role: 'admin', password: hash } });
    await db.client.user.create({ data: { uid: 'ana', email: 'ana@x.com', displayName: 'Ana', role: 'cliente', password: hash } });
    await db.client.user.create({ data: { uid: 'luis', email: 'luis@x.com', displayName: 'Luis', role: 'cliente' } });
    await db.client.category.create({ data: { id: 'cat-1', name: 'Desayunos', description: 'Cestas', order: 1, isDefault: true } });
    await db.client.category.create({ data: { id: 'cat-2', name: 'Adicionales', order: 2 } });
    await db.client.product.create({ data: { id: 'p1', name: 'DESAYUNO CON DIAMANTES', price: 35, category: 'Desayunos', description: 'Cesta', local_image_path: '/uploads/p1.webp', showOnHome: true, createdAt: at(300) } });
    await db.client.product.create({ data: { id: 'p2', name: 'GLOBO', price: 5.5, category: 'Adicionales', local_image_path: 'http://localhost:3500/uploads/p2.webp', createdAt: at(200) } });
    await db.client.offer.create({ data: { id: 'of-1', title: 'Banner', description: 'Rebajas', type: 'banner', active: true, backgroundColor: '#8B4513', createdAt: at(100) } });
    await db.client.offer.create({ data: { id: 'of-2', title: 'Cupón', type: 'coupon', active: false, code: 'DIAMANTE10', discountPercent: 10, createdAt: at(90) } });
    await db.client.campaign.create({ data: { id: 'camp-1', title: 'Otoño', subject: 'Novedades', content: '<p>Hola</p>', createdAt: at(80) } });
    await db.insertOrders([
        { id: 'o-paid', redsysOrderId: '100000000001', customer_uid: 'ana', customer_name: 'Ana', customer_email: 'ana@x.com', delivery_date: '2099-03-03', delivery_timeSlot: '10:00', delivery_proximity: 'near', status: 'paid', total: 35, createdAt: at(60), items: [{ productId: 'p1', name: 'DESAYUNO CON DIAMANTES', price: 35, quantity: 1 }] },
        { id: 'o-pend', redsysOrderId: '100000000002', customer_uid: 'luis', customer_name: 'Luis', customer_email: 'luis@x.com', delivery_date: '2099-03-04', delivery_timeSlot: '11:00', status: 'pending', total: 40.5, createdAt: at(2), updatedAt: at(2), items: [{ productId: 'p1', name: 'DESAYUNO CON DIAMANTES', price: 35, quantity: 1 }, { productId: 'p2', name: 'GLOBO', price: 5.5, quantity: 1 }] },
        { id: 'o-old', redsysOrderId: '100000000003', customer_name: 'Invitado', delivery_date: '2099-03-03', delivery_timeSlot: '12:30', status: 'pending', createdAt: at(30), updatedAt: at(30) },
        { id: 'o-canc', redsysOrderId: '100000000004', customer_uid: 'ana', delivery_date: '2099-03-04', delivery_timeSlot: '09:00', status: 'cancelled', createdAt: at(50) }
    ]);
}

// ---------------------------------------------------------------- guion de peticiones
const steps = [
    // Autenticación
    ['login correcto', 'POST', '/api/auth/login', { body: { email: 'admin@x.com', password: 'secreto123' } }],
    ['login contraseña errónea', 'POST', '/api/auth/login', { body: { email: 'admin@x.com', password: 'mal' } }],
    ['login usuario inexistente', 'POST', '/api/auth/login', { body: { email: 'nadie@x.com', password: 'x' } }],
    ['registro nuevo', 'POST', '/api/auth/register', { body: { email: 'nuevo@x.com', password: 'secreto123', displayName: 'Nuevo' } }],
    ['registro email repetido', 'POST', '/api/auth/register', { body: { email: 'ana@x.com', password: 'secreto123', displayName: 'Otra' } }],
    // Productos
    ['productos: lista', 'GET', '/api/products'],
    ['productos: uno', 'GET', '/api/products/p1'],
    ['productos: inexistente', 'GET', '/api/products/nope'],
    ['productos: crear', 'POST', '/api/products', { auth: ADMIN, body: { id: 'p3', name: 'ZUMO', price: 4, category: 'Adicionales', description: 'Naranja', showOnHome: false } }],
    ['productos: crear sin sesión', 'POST', '/api/products', { body: { id: 'p9', name: 'X' } }],
    ['productos: actualizar', 'PUT', '/api/products/p3', { auth: ADMIN, body: { name: 'ZUMO GRANDE', price: 4.5, showOnHome: true } }],
    ['productos: actualizar inexistente', 'PUT', '/api/products/nope', { auth: ADMIN, body: { name: 'X' } }],
    ['productos: borrar', 'DELETE', '/api/products/p3', { auth: ADMIN }],
    ['productos: borrar inexistente', 'DELETE', '/api/products/nope', { auth: ADMIN }],
    // Categorías
    ['categorías: lista', 'GET', '/api/categories'],
    ['categorías: crear', 'POST', '/api/categories', { auth: ADMIN, body: { id: 'cat-3', name: 'Bebidas', description: 'Zumos', order: 3 } }],
    ['categorías: actualizar', 'PUT', '/api/categories/cat-3', { auth: ADMIN, body: { name: 'Bebidas frías', order: 4 } }],
    ['categorías: borrar', 'DELETE', '/api/categories/cat-3', { auth: ADMIN }],
    // Ofertas
    ['ofertas: todas', 'GET', '/api/offers'],
    ['ofertas: activas', 'GET', '/api/offers?active=true'],
    ['ofertas: crear', 'POST', '/api/offers', { auth: ADMIN, body: { title: 'Nueva', description: 'Desc', type: 'product_deal', active: true, productId: 'p1', ribbonText: '¡Oferta!', ribbonColor: '#e67e22', ribbonTextColor: '#ffffff' } }],
    ['ofertas: actualizar', 'PUT', '/api/offers/of-2', { auth: ADMIN, body: { title: 'Cupón 15', discountPercent: 15, active: true } }],
    ['ofertas: borrar', 'DELETE', '/api/offers/of-1', { auth: ADMIN }],
    // Configuración de disponibilidad
    ['config: leer', 'GET', '/api/config/appointment'],
    ['config: guardar sin sesión', 'POST', '/api/config/appointment', { body: { x: 1 } }],
    ['config: guardar', 'POST', '/api/config/appointment', { auth: ADMIN, body: { ...config, maxDeliveryMinutes: 45 } }],
    ['config: leer tras guardar', 'GET', '/api/config/appointment'],
    // Pedidos
    ['pedidos: ocupación de un día', 'GET', '/api/orders/occupancy?date=2099-03-03'],
    ['pedidos: ocupación de un rango', 'GET', '/api/orders/occupancy?start=2099-03-01&end=2099-03-31'],
    ['pedidos: lista sin sesión', 'GET', '/api/orders'],
    ['pedidos: lista admin', 'GET', '/api/orders', { auth: ADMIN }],
    ['pedidos: mis pedidos (Ana)', 'GET', '/api/orders?mine=1', { auth: ANA }],
    ['pedidos: mis pedidos (admin)', 'GET', '/api/orders?mine=1', { auth: ADMIN }],
    ['pedidos: estado público', 'GET', '/api/orders/o-pend/status'],
    ['pedidos: estado inexistente', 'GET', '/api/orders/nope/status'],
    ['pedidos: detalle propio', 'GET', '/api/orders/o-paid', { auth: ANA }],
    ['pedidos: detalle ajeno', 'GET', '/api/orders/o-paid', { auth: LUIS }],
    ['pedidos: detalle admin', 'GET', '/api/orders/o-pend', { auth: ADMIN }],
    ['pedidos: crear', 'POST', '/api/orders', { auth: LUIS, body: { id: '200000000001', total: 40.5, customer: { name: 'Luis', email: 'luis@x.com', phone: '600111222' }, delivery: { address: 'C/ Dos 7', addressExtra: '2º B', city: 'Madrid', zip: '28002', date: '2099-03-03', timeSlot: '11:30', message: 'Feliz día' }, items: [{ product: { id: 'p1', name: 'DESAYUNO CON DIAMANTES', price: 35 }, quantity: 1 }, { product: { id: 'p2', name: 'GLOBO', price: 5.5 }, quantity: 1 }] } }],
    ['pedidos: crear en hora ocupada', 'POST', '/api/orders', { body: { id: '200000000002', total: 20, customer: { name: 'Otro', email: 'o@x.com', phone: '600000000' }, delivery: { address: 'C/ Tres 1', city: 'Madrid', zip: '28003', date: '2099-03-03', timeSlot: '10:00' }, items: [] } }],
    // Pagos (Stripe simulado)
    ['pago: iniciar', 'POST', '/api/payment/create-payment', { body: { amount: 40.5, orderId: '100000000002', description: 'Pedido' } }],
    ['pago: iniciar pedido pagado', 'POST', '/api/payment/create-payment', { body: { amount: 35, orderId: '100000000001' } }],
    ['pago: aviso completado', 'WEBHOOK', { id: 'evt_1', object: 'event', type: 'checkout.session.completed', data: { object: { id: 'cs_test_1', object: 'checkout.session', payment_intent: 'pi_1', metadata: { orderId: '100000000002' } } } }],
    ['pago: aviso fallido', 'WEBHOOK', { id: 'evt_2', object: 'event', type: 'payment_intent.payment_failed', data: { object: { id: 'pi_2', object: 'payment_intent', metadata: { orderId: '100000000003' } } } }],
    ['pedidos: cambiar estado', 'PUT', '/api/orders/o-paid/status', { auth: ADMIN, body: { status: 'delivered' } }],
    ['pedidos: cambiar estado inexistente', 'PUT', '/api/orders/nope/status', { auth: ADMIN, body: { status: 'delivered' } }],
    ['pago: iniciar pedido entregado', 'POST', '/api/payment/create-payment', { body: { amount: 35, orderId: '100000000001' } }],
    // Ruta de reparto
    ['ruta: calcular', 'POST', '/api/logistics/optimize', { auth: ADMIN, body: { date: '2099-03-04', orderIds: ['o-pend'], marginMinutes: 10 } }],
    ['ruta: pedido cancelado', 'POST', '/api/logistics/optimize', { auth: ADMIN, body: { date: '2099-03-04', orderIds: ['o-canc'] } }],
    // Campañas
    ['campaña: envío sin sesión', 'POST', '/api/campaign/send-bulk', { body: { recipients: ['a@x.com'] } }],
    ['campaña: envío', 'POST', '/api/campaign/send-bulk', { auth: ADMIN, body: { campaignId: 'camp-1', header: 'H', summary: 'S', message: 'M', recipients: ['a@x.com', 'b@x.com'] } }]
];

async function dumpTables() {
    const c = db.client;
    const order = (by) => ({ orderBy: by });
    return {
        User: await c.user.findMany(order({ email: 'asc' })),
        Product: await c.product.findMany(order({ id: 'asc' })),
        Category: await c.category.findMany(order({ name: 'asc' })),
        Offer: await c.offer.findMany(order({ title: 'asc' })),
        Campaign: await c.campaign.findMany(order({ title: 'asc' })),
        Configuration: await c.configuration.findMany(),
        Order: await c.order.findMany(order({ id: 'asc' })),
        OrderItem: (await c.orderItem.findMany({ orderBy: [{ orderId: 'asc' }, { name: 'asc' }] })).map(({ id, ...rest }) => rest)
    };
}

let server; let base;
test.before(async () => { await new Promise(r => { server = app.listen(0, r); }); base = `http://127.0.0.1:${server.address().port}`; });
test.after(async () => { server.close(); await db.client.$disconnect(); });

test('regresión: respuestas de todos los endpoints con base de datos y estado final de las tablas', async () => {
    resetStubs();
    maps.route = { minutes: 10, km: 5 };
    await seed();

    const results = {};
    for (const [name, method, target, opts = {}] of steps) {
        let res;
        if (method === 'WEBHOOK') {
            const payload = JSON.stringify(target);
            res = await fetch(`${base}/api/payment/stripe-webhook`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'stripe-signature': signWebhook(payload) }, body: payload });
        } else {
            res = await fetch(base + target, {
                method,
                headers: { 'Content-Type': 'application/json', ...(opts.auth ? { Authorization: `Bearer ${opts.auth}` } : {}) },
                body: opts.body ? JSON.stringify(opts.body) : undefined
            });
        }
        const text = await res.text();
        let body; try { body = JSON.parse(text); } catch { body = text; }
        results[name] = normalize({ status: res.status, body });
    }
    // Los envíos de correo se lanzan sin esperar: se deja terminar lo pendiente antes de leer las tablas.
    await new Promise(r => setTimeout(r, 200));
    const actual = { responses: results, tables: normalize(await dumpTables()) };

    if (process.env.UPDATE_SNAPSHOTS === '1' || !fs.existsSync(SNAPSHOT)) {
        fs.mkdirSync(path.dirname(SNAPSHOT), { recursive: true });
        fs.writeFileSync(SNAPSHOT, JSON.stringify(actual, null, 2) + '\n');
        return;
    }
    const expected = JSON.parse(fs.readFileSync(SNAPSHOT, 'utf8'));
    for (const name of Object.keys(expected.responses)) {
        assert.deepEqual(actual.responses[name], expected.responses[name], `respuesta distinta en «${name}»`);
    }
    assert.deepEqual(Object.keys(actual.responses), Object.keys(expected.responses));
    for (const table of Object.keys(expected.tables)) {
        assert.deepEqual(actual.tables[table], expected.tables[table], `contenido distinto en la tabla ${table}`);
    }
});
