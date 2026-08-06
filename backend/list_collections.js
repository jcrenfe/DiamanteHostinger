const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const path = require('path');

const serviceAccount = require(path.join(__dirname, 'secrets', 'diamante-f70f4-2dfe26b2bdb7.json'));

const app = initializeApp({
  credential: cert(serviceAccount)
});

const db = getFirestore(app, 'diamante-bd');

async function listCollections() {
  try {
    const collections = await db.listCollections();
    console.log('Collections in diamante-bd:');
    for (const collection of collections) {
      const snap = await collection.get();
      console.log(`- ${collection.id} (${snap.size} documents)`);
    }
  } catch (error) {
    console.error('Error listing collections:', error);
  }
}

listCollections();
