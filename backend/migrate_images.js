const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const { getStorage } = require('firebase-admin/storage');
const path = require('path');
const fs = require('fs');

const serviceAccount = require(path.join(__dirname, 'secrets', 'diamante-f70f4-2dfe26b2bdb7.json'));

const app = initializeApp({
  credential: cert(serviceAccount),
  storageBucket: 'diamante-f70f4.appspot.com'
});

const db = getFirestore(app);
const bucket = getStorage(app).bucket();

const prodDir = 'c:\\WEBs\\Diamante\\frontend\\public\\assets\\images';

async function migrate() {
  console.info('Starting migration...');

  // Migration for Products
  const prodsSnap = await db.collection('productos').get();
  console.info(`Found ${prodsSnap.size} products.`);
  for (const doc of prodsSnap.docs) {
    const data = doc.data();
    let imagePath = data.local_image_path;

    if (imagePath && (imagePath.startsWith('/assets/images/') || imagePath.startsWith('assets/images/'))) {
      const fileName = path.basename(imagePath);
      const localFile = path.join(prodDir, fileName);

      if (fs.existsSync(localFile)) {
        console.info(`Migrating product image: ${fileName}`);
        const dest = `productos/${fileName}`;
        await bucket.upload(localFile, { destination: dest, metadata: { contentType: 'image/webp' } });
        const publicUrl = `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURIComponent(dest)}?alt=media`;
        await doc.ref.update({ local_image_path: publicUrl });
      } else {
          console.warn(`File not found: ${localFile}`);
      }
    }
  }

  // Migration for Offers
  const offersSnap = await db.collection('ofertas').get();
  console.info(`Found ${offersSnap.size} offers.`);
  for (const doc of offersSnap.docs) {
    const data = doc.data();
    let imagePath = data.backgroundImage;

    if (imagePath && (imagePath.startsWith('/assets/images/') || imagePath.startsWith('assets/images/'))) {
      const fileName = path.basename(imagePath);
      const localFile = path.join(prodDir, fileName);

      if (fs.existsSync(localFile)) {
        console.info(`Migrating offer image: ${fileName}`);
        const dest = `ofertas/${fileName}`;
        await bucket.upload(localFile, { destination: dest, metadata: { contentType: 'image/webp' } });
        const publicUrl = `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURIComponent(dest)}?alt=media`;
        await doc.ref.update({ backgroundImage: publicUrl });
      } else {
          console.warn(`File not found: ${localFile}`);
      }
    }
  }

  console.info('Migration finished successfully!');
}

migrate().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});
