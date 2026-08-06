const admin = require('firebase-admin');
const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');
const axios = require('axios');
require('dotenv').config();

const serviceAccount = require(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);

const { getFirestore } = require('firebase-admin/firestore');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = getFirestore("diamante-bd");
const prisma = new PrismaClient();

const UPLOADS_DIR = path.join(__dirname, 'public', 'uploads');
if (!fs.existsSync(UPLOADS_DIR)) {
    fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

// Helper para descargar imágenes
async function downloadImage(url, filename) {
    if (!url || !url.startsWith('http')) return url; // Ya es local o null
    try {
        const response = await axios({
            url,
            method: 'GET',
            responseType: 'stream'
        });
        const filepath = path.join(UPLOADS_DIR, filename);
        
        return new Promise((resolve, reject) => {
            const writer = fs.createWriteStream(filepath);
            response.data.pipe(writer);
            writer.on('finish', () => resolve(`/uploads/${filename}`));
            writer.on('error', reject);
        });
    } catch (e) {
        console.error(`Error downloading image ${url}:`, e.message);
        return url;
    }
}

async function migrateUsers() {
    console.log('Migrando usuarios...');
    const snapshot = await db.collection('usuarios').get();
    let count = 0;
    for (const doc of snapshot.docs) {
        const data = doc.data();
        try {
            await prisma.user.upsert({
                where: { uid: doc.id },
                update: {
                    displayName: data.displayName || data.name || '',
                    role: data.role || (data.isAdmin ? 'admin' : 'cliente')
                },
                create: {
                    uid: doc.id,
                    email: data.email || `${doc.id}@migrated.local`,
                    displayName: data.displayName || data.name || '',
                    role: data.role || (data.isAdmin ? 'admin' : 'cliente')
                }
            });
            count++;
        } catch (e) {
            console.error(`Error migrando usuario ${doc.id}: ${e.message}`);
        }
    }
    console.log(`Migrados ${count} usuarios.`);
}

async function migrateProducts() {
    console.log('Migrando productos...');
    const snapshot = await db.collection('productos').get();
    let count = 0;
    for (const doc of snapshot.docs) {
        const data = doc.data();
        try {
            let localImagePath = data.local_image_path || data.imageUrl || '';
            
            // Descargar imagen si viene de Firebase Storage
            if (localImagePath.includes('firebasestorage')) {
                const ext = localImagePath.split('?')[0].split('.').pop() || 'jpg';
                const filename = `prod_${doc.id}.${ext}`;
                localImagePath = await downloadImage(localImagePath, filename);
            }

            await prisma.product.upsert({
                where: { id: doc.id },
                update: {
                    name: data.name || '',
                    price: Number(data.price) || 0,
                    description: data.description || '',
                    category: data.category || 'Varios',
                    local_image_path: localImagePath,
                    showOnHome: data.showOnHome || false
                },
                create: {
                    id: doc.id,
                    name: data.name || '',
                    price: Number(data.price) || 0,
                    description: data.description || '',
                    category: data.category || 'Varios',
                    local_image_path: localImagePath,
                    showOnHome: data.showOnHome || false
                }
            });
            count++;
        } catch (e) {
            console.error(`Error migrando producto ${doc.id}: ${e.message}`);
        }
    }
    console.log(`Migrados ${count} productos.`);
}

async function migrateOffers() {
    console.log('Migrando ofertas (Offers)...');
    const snapshot = await db.collection('ofertas').get();
    let count = 0;
    for (const doc of snapshot.docs) {
        const data = doc.data();
        try {
            // Convertiremos ofertas antiguas a la nueva estructura si es necesario
            await prisma.offer.upsert({
                where: { id: doc.id },
                update: {
                    title: data.title || data.name || 'Oferta',
                    description: data.description || '',
                    discount: Number(data.discount) || 0,
                    active: data.active !== undefined ? data.active : true
                },
                create: {
                    id: doc.id,
                    title: data.title || data.name || 'Oferta',
                    description: data.description || '',
                    discount: Number(data.discount) || 0,
                    active: data.active !== undefined ? data.active : true
                }
            });
            count++;
        } catch (e) {
            console.error(`Error migrando oferta ${doc.id}: ${e.message}`);
        }
    }
    console.log(`Migradas ${count} ofertas.`);
}

async function migrateOrders() {
  console.log('Migrando pedidos...');
  const snapshot = await db.collection('pedidos').get();
  let count = 0;
  for (const doc of snapshot.docs) {
    const data = doc.data();
    
    // Preparar el usuario si existe
    if (data.customer?.uid) {
        try {
            await prisma.user.upsert({
                where: { uid: data.customer.uid },
                update: {
                    displayName: data.customer.name
                },
                create: {
                    uid: data.customer.uid,
                    email: data.customer.email,
                    displayName: data.customer.name,
                    role: 'cliente'
                }
            });
        } catch (err) {
            // Si el correo ya existe, puede fallar el unique constraint
        }
    }

    try {
        const orderId = doc.id;
        
        // Comprobar si existe para no duplicar order items
        const existingOrder = await prisma.order.findUnique({ where: { id: orderId } });
        
        if (existingOrder) {
             await prisma.orderItem.deleteMany({ where: { orderId: orderId } });
        }

        const items = Array.isArray(data.items) ? data.items : [];
        
        await prisma.order.upsert({
            where: { id: orderId },
            update: {
                status: data.status || 'pending',
                total: Number(data.total) || 0
            },
            create: {
                id: orderId,
                redsysOrderId: data.redsysOrderId ? String(data.redsysOrderId) : null,
                stripeSessionId: data.stripeSessionId || null,
                customer_uid: data.customer?.uid || null,
                customer_name: data.customer?.name || 'Anónimo',
                customer_email: data.customer?.email || 'sin@email.com',
                customer_phone: data.customer?.phone || '',
                delivery_address: data.delivery?.address || '',
                delivery_city: data.delivery?.city || '',
                delivery_zip: data.delivery?.zip || '',
                delivery_date: data.delivery?.date || '',
                delivery_timeSlot: data.delivery?.timeSlot || '',
                delivery_message: data.delivery?.message || null,
                total: Number(data.total) || 0,
                status: data.status || 'pending',
                createdAt: data.createdAt ? data.createdAt.toDate() : new Date(),
                updatedAt: data.updatedAt ? data.updatedAt.toDate() : new Date(),
                items: {
                    create: items.map(item => ({
                        productId: item.id || null,
                        name: item.name || 'Producto',
                        price: Number(item.price) || 0,
                        quantity: Number(item.quantity) || 1
                    }))
                }
            }
        });
        count++;
    } catch (e) {
        console.error(`Error migrando pedido ${doc.id}: ${e.message}`);
    }
  }
  console.log(`Migrados ${count} pedidos.`);
}

async function main() {
  await migrateUsers();
  await migrateProducts();
  await migrateOffers();
  await migrateOrders();
}

main()
  .catch(e => {
    console.error('Migration failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    console.log('Migración finalizada con éxito.');
  });
