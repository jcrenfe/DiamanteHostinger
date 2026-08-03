const admin = require('firebase-admin');
const path = require('path');
const fs = require('fs');

const serviceAccount = require('c:\\WEBs\\Diamante\\backend\\secrets\\diamante-f70f4-2dfe26b2bdb7.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  storageBucket: 'diamante-f70f4.appspot.com'
});

// Explicitly use the diamante-bd database
const db = admin.firestore().getFirestore('diamante-bd');
const bucket = admin.storage().bucket();

const prodDir = 'c:\\WEBs\\Diamante\\frontend\\public\\assets\\images';

async function migrate() {
  console.info('Starting migration...');

  // Migration for Products
  const prodsSnap = await db.collection('productos').get();
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
        const file = bucket.file(dest);
        const [url] = await file.getSignedUrl({ action: 'read', expires: '03-09-2491' });
        
        // Use a persistent download URL format if possible or update for Firebase Storage URL
        const publicUrl = `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURIComponent(dest)}?alt=media`;
        
        await doc.ref.update({ local_image_path: publicUrl });
      }
    }
  }

  // Migration for Offers
  const offersSnap = await db.collection('ofertas').get();
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
      }
    }
  }

  console.info('Migration finished successfully!');
}

migrate().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});
