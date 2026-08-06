const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const path = require('path');

const serviceAccount = require(path.join(__dirname, 'secrets', 'diamante-f70f4-2dfe26b2bdb7.json'));

const app = initializeApp({
  credential: cert(serviceAccount)
});

const db = getFirestore(app, 'diamante-bd');

async function dumpOffer() {
  console.log('Fetching offer from Firebase...');
  try {
      const snap = await db.collection('ofertas').limit(3).get();
      for (const doc of snap.docs) {
          console.log(`--- Offer ${doc.id} ---`);
          console.log(JSON.stringify(doc.data(), null, 2));
      }
  } catch(e) {
      console.error('Error fetching offers:', e.message);
  }
}

dumpOffer();
