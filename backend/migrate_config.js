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

async function migrateConfig() {
  console.log('Migrating configuration from Firebase...');
  try {
      const snap = await db.collection('configuracion').get();
      let count = 0;
      for (const doc of snap.docs) {
          const data = doc.data();
          await prisma.configuration.upsert({
              where: { id: doc.id },
              update: { value: data },
              create: { id: doc.id, value: data }
          });
          count++;
          console.log(`Migrated configuration document: ${doc.id}`);
      }
      console.log(`Total config documents migrated: ${count}`);
  } catch(e) {
      console.error('Error migrating configuration:', e.message);
  } finally {
      await prisma.$disconnect();
  }
}

migrateConfig();
