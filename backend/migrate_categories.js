const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const { PrismaClient } = require('@prisma/client');
const path = require('path');

const serviceAccount = require(path.join(__dirname, 'secrets', 'diamante-f70f4-2dfe26b2bdb7.json'));
const app = initializeApp({ credential: cert(serviceAccount) });
const db = getFirestore(app, 'diamante-bd');
const prisma = new PrismaClient();

async function migrate() {
    console.log('Fetching categorias...');
    const snap = await db.collection('categorias').get();
    let count = 0;
    for (const doc of snap.docs) {
        const data = doc.data();
        const id = data.id || doc.id;
        
        await prisma.category.upsert({
            where: { id: id },
            update: {
                name: data.name,
                order: data.order || 0,
                isDefault: data.isDefault || false
            },
            create: {
                id: id,
                name: data.name,
                order: data.order || 0,
                isDefault: data.isDefault || false
            }
        });
        count++;
    }
    console.log(`Migrated ${count} categories.`);

    // Fix the image typo in offer 5B5vS4yvWJCO1G6VAcYK
    try {
        await prisma.offer.update({
            where: { id: "5B5vS4yvWJCO1G6VAcYK" },
            data: { backgroundImage: "assets/images/la_naranja_mecanica.png" }
        });
        console.log("Updated offer 5B5vS4yvWJCO1G6VAcYK image path.");
    } catch(e) {
        console.log("Offer 5B5vS4yvWJCO1G6VAcYK not found or couldn't be updated.");
    }

    await prisma.$disconnect();
}
migrate();
