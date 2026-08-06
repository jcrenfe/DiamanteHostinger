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

async function migrateOffers() {
  console.log('Migrating offers from Firebase...');
  try {
      const snap = await db.collection('ofertas').get();
      let count = 0;
      for (const doc of snap.docs) {
          const data = doc.data();
          
          await prisma.offer.upsert({
              where: { id: doc.id },
              update: {
                  title: data.title || 'Oferta',
                  description: data.description || null,
                  code: data.code || null,
                  discountPercent: data.discountPercent || null,
                  active: data.active !== undefined ? data.active : true,
                  type: data.type || 'banner',
                  imageUrl: data.imageUrl || null,
                  validUntil: data.validUntil ? new Date(data.validUntil) : null,
                  backgroundImage: data.backgroundImage || null,
                  backgroundColor: data.backgroundColor || null,
                  productId: data.productId || null,
                  ribbonText: data.ribbonText || null,
                  ribbonColor: data.ribbonColor || null,
                  ribbonTextColor: data.ribbonTextColor || null
              },
              create: {
                  id: doc.id,
                  title: data.title || 'Oferta',
                  description: data.description || null,
                  code: data.code || null,
                  discountPercent: data.discountPercent || null,
                  active: data.active !== undefined ? data.active : true,
                  type: data.type || 'banner',
                  imageUrl: data.imageUrl || null,
                  validUntil: data.validUntil ? new Date(data.validUntil) : null,
                  backgroundImage: data.backgroundImage || null,
                  backgroundColor: data.backgroundColor || null,
                  productId: data.productId || null,
                  ribbonText: data.ribbonText || null,
                  ribbonColor: data.ribbonColor || null,
                  ribbonTextColor: data.ribbonTextColor || null
              }
          });
          count++;
          console.log(`Migrated offer document: ${doc.id}`);
      }
      console.log(`Total offer documents migrated: ${count}`);
  } catch(e) {
      console.error('Error migrating offers:', e);
  } finally {
      await prisma.$disconnect();
  }
}

migrateOffers();
