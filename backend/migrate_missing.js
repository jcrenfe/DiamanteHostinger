const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const { PrismaClient } = require('@prisma/client');
const path = require('path');

const serviceAccount = require(path.join(__dirname, 'secrets', 'diamante-f70f4-2dfe26b2bdb7.json'));

const app = initializeApp({
  credential: cert(serviceAccount)
});

const db = getFirestore(app, 'diamante-bd');
const prisma = new PrismaClient();

async function migrate() {
  console.log('Starting migration for missing data...');

  // 1. Missing Users
  console.log('Checking users...');
  const usersSnap = await db.collection('users').get();
  let usersCount = 0;
  for (const doc of usersSnap.docs) {
      const data = doc.data();
      const existing = await prisma.user.findUnique({ where: { uid: doc.id } });
      if (!existing) {
          try {
              await prisma.user.create({
                  data: {
                      uid: doc.id,
                      email: data.email || `${doc.id}@migrated.local`,
                      displayName: data.displayName || data.name || '',
                      role: data.role || (data.isAdmin ? 'admin' : 'cliente')
                  }
              });
              usersCount++;
              console.log(`Migrated user: ${doc.id}`);
          } catch(e) {
              console.error(`Error migrating user ${doc.id}:`, e.message);
          }
      }
  }
  // Wait, etl.js checks "usuarios" not "users" collection!
  // Let's check "usuarios" as well, just in case.
  const usuariosSnap = await db.collection('usuarios').get();
  for (const doc of usuariosSnap.docs) {
      const data = doc.data();
      const existing = await prisma.user.findUnique({ where: { uid: doc.id } });
      if (!existing) {
          try {
              await prisma.user.create({
                  data: {
                      uid: doc.id,
                      email: data.email || `${doc.id}@migrated.local`,
                      displayName: data.displayName || data.name || '',
                      role: data.role || (data.isAdmin ? 'admin' : 'cliente')
                  }
              });
              usersCount++;
              console.log(`Migrated usuario: ${doc.id}`);
          } catch(e) {
              console.error(`Error migrating usuario ${doc.id}:`, e.message);
          }
      }
  }

  // 2. Campaigns
  console.log('Checking campaigns...');
  const campSnap = await db.collection('campañas').get();
  let campCount = 0;
  for (const doc of campSnap.docs) {
      const data = doc.data();
      const existing = await prisma.campaign.findUnique({ where: { id: doc.id } });
      if (!existing) {
          try {
              await prisma.campaign.create({
                  data: {
                      id: doc.id,
                      title: data.title || 'Campaña sin título',
                      subject: data.subject || '',
                      content: data.content || '',
                      status: data.status || 'draft',
                      createdAt: data.createdAt ? data.createdAt.toDate() : new Date(),
                      updatedAt: data.updatedAt ? data.updatedAt.toDate() : new Date()
                  }
              });
              campCount++;
              console.log(`Migrated campaign: ${doc.id}`);
          } catch(e) {
              console.error(`Error migrating campaign ${doc.id}:`, e.message);
          }
      }
  }

  // 3. Order Items
  console.log('Checking order items...');
  const ordersSnap = await db.collection('pedidos').get();
  let itemsCount = 0;
  for (const doc of ordersSnap.docs) {
      const data = doc.data();
      const orderId = doc.id;
      
      const items = Array.isArray(data.items) ? data.items : [];
      
      const existingItems = await prisma.orderItem.findMany({ where: { orderId } });
      
      if (existingItems.length === 0 && items.length > 0) {
          try {
              for (const item of items) {
                  await prisma.orderItem.create({
                      data: {
                          orderId: orderId,
                          productId: item.id || null,
                          name: item.name || 'Producto',
                          price: Number(item.price) || 0,
                          quantity: Number(item.quantity) || 1
                      }
                  });
                  itemsCount++;
              }
              console.log(`Migrated ${items.length} items for order ${orderId}`);
          } catch (e) {
              console.error(`Error migrating items for order ${orderId}:`, e.message);
          }
      }
  }

  console.log('--- MIGRATION RESULTS ---');
  console.log(`Missing Users migrated: ${usersCount}`);
  console.log(`Campaigns migrated: ${campCount}`);
  console.log(`Order Items migrated: ${itemsCount}`);
}

migrate()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
