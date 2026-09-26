// Proceso independiente (como otra instancia del servidor) que intenta reservar la misma hora con withLock.
// Lee si ya hay reserva, espera un poco para forzar el solape y, si estaba libre, crea el pedido.
require('./env');
const { prisma, withLock } = require('../../src/config/prisma');

const id = process.argv[2];
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

withLock('slot:2099-09-09', async (tx) => {
    const taken = await tx.order.count({ where: { delivery_date: '2099-09-09', delivery_timeSlot: '10:00' } });
    await sleep(300);
    if (taken) return 'ocupada';
    await tx.order.create({ data: {
        id, customer_name: 'Proceso', customer_email: 'p@x.com', customer_phone: '600000000',
        delivery_address: 'C/ Uno 1', delivery_city: 'Madrid', delivery_zip: '28001',
        delivery_date: '2099-09-09', delivery_timeSlot: '10:00', total: 10
    } });
    return 'reservada';
})
    .then((r) => console.log(r))
    .catch((e) => { console.log('error', e.message); process.exitCode = 1; })
    .finally(() => prisma.$disconnect());
