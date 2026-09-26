// Acceso directo a la base de pruebas para preparar datos y comprobar resultados.
// Usa su propio cliente de Prisma, independiente del de la aplicación.
const { url } = require('./env');
const { PrismaClient } = require('@prisma/client');
const { PrismaMariaDb } = require('@prisma/adapter-mariadb');

const u = new URL(url);
const client = new PrismaClient({
    adapter: new PrismaMariaDb({
        host: u.hostname, port: Number(u.port || 3306),
        user: decodeURIComponent(u.username), password: decodeURIComponent(u.password),
        database: u.pathname.slice(1), connectionLimit: 3, allowPublicKeyRetrieval: true
    })
});

const TABLES = ['OrderItem', 'Order', 'User', 'Product', 'Category', 'Offer', 'Campaign', 'Configuration', 'SlotLock'];

/** Vacía todas las tablas (la estructura y las migraciones se conservan). */
async function reset() {
    // Misma conexión para todas las sentencias: FOREIGN_KEY_CHECKS es por sesión.
    await client.$transaction(async (tx) => {
        await tx.$executeRawUnsafe('SET FOREIGN_KEY_CHECKS = 0');
        for (const t of TABLES) await tx.$executeRawUnsafe(`TRUNCATE TABLE \`${t}\``);
        await tx.$executeRawUnsafe('SET FOREIGN_KEY_CHECKS = 1');
    });
}

async function setConfig(value) {
    await client.configuration.deleteMany({});
    if (value) await client.configuration.create({ data: { id: 'disponibilidad', value } });
}

async function ensureUser(uid, extra = {}) {
    return client.user.upsert({
        where: { uid },
        update: {},
        create: { uid, email: `${uid}@x.com`, displayName: uid, role: 'cliente', ...extra }
    });
}

const ORDER_DEFAULTS = {
    customer_name: 'Cliente', customer_email: 'cliente@x.com', customer_phone: '600000000',
    delivery_address: 'C/ Uno 1', delivery_city: 'Madrid', delivery_zip: '28001',
    delivery_date: '2099-03-03', delivery_timeSlot: '10:00', total: 20, status: 'pending'
};

/** Inserta pedidos completando los campos obligatorios; crea los usuarios que referencien. */
async function insertOrders(rows) {
    const out = [];
    for (const row of rows) {
        const { items, ...data } = row;
        if (data.customer_uid) await ensureUser(data.customer_uid);
        const order = await client.order.create({ data: { ...ORDER_DEFAULTS, ...data } });
        for (const it of items || []) {
            await client.orderItem.create({ data: { orderId: order.id, name: 'Producto', price: 10, quantity: 1, ...it } });
        }
        out.push(order);
    }
    return out;
}

const orders = () => client.order.findMany({ orderBy: [{ createdAt: 'asc' }, { id: 'asc' }] });
const order = (id) => client.order.findUnique({ where: { id } });
const items = () => client.orderItem.findMany({ orderBy: { id: 'asc' } });

module.exports = { client, reset, setConfig, ensureUser, insertOrders, orders, order, items };
