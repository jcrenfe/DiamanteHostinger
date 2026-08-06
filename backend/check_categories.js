const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const path = require('path');

const serviceAccount = require(path.join(__dirname, 'secrets', 'diamante-f70f4-2dfe26b2bdb7.json'));

const app = initializeApp({
  credential: cert(serviceAccount)
});

const db = getFirestore(app, 'diamante-bd');

async function check() {
  console.log('Fetching categorias...');
  const snap = await db.collection('categorias').get();
  for (const doc of snap.docs) {
      console.log(doc.id, doc.data());
  }
}

check();
