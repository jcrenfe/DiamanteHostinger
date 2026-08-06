const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const path = require('path');

const serviceAccount = require(path.join(__dirname, 'secrets', 'diamante-f70f4-2dfe26b2bdb7.json'));

const app = initializeApp({
  credential: cert(serviceAccount)
});

const db = getFirestore(app, 'diamante-bd');

async function dump() {
  const snap = await db.collection('configuracion').get();
  snap.forEach(doc => {
    console.log(`Doc: ${doc.id}`);
    console.log(doc.data());
  });
}
dump().catch(console.error);
