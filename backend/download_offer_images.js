const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');
const https = require('https');

const prisma = new PrismaClient();
const uploadsDir = path.join(__dirname, 'public', 'uploads');

// Ensure uploads directory exists
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}

function downloadImage(url, destPath) {
    return new Promise((resolve, reject) => {
        const file = fs.createWriteStream(destPath);
        https.get(url, (response) => {
            if (response.statusCode !== 200) {
                reject(new Error(`Failed to get '${url}' (${response.statusCode})`));
                return;
            }
            response.pipe(file);
            file.on('finish', () => {
                file.close(resolve);
            });
        }).on('error', (err) => {
            fs.unlink(destPath, () => reject(err));
        });
    });
}

function generateFilename(id, fieldName) {
    return `offer_${id}_${fieldName}.webp`;
}

async function run() {
    console.log('Fetching offers...');
    const offers = await prisma.offer.findMany();
    
    let updatedCount = 0;
    
    for (const offer of offers) {
        let updated = false;
        const updateData = {};
        
        // Process imageUrl
        if (offer.imageUrl && offer.imageUrl.includes('firebasestorage.googleapis.com')) {
            console.log(`Downloading imageUrl for offer ${offer.id}...`);
            const filename = generateFilename(offer.id, 'image');
            const destPath = path.join(uploadsDir, filename);
            try {
                await downloadImage(offer.imageUrl, destPath);
                updateData.imageUrl = `/uploads/${filename}`;
                updated = true;
            } catch (err) {
                console.error(`Failed to download imageUrl for offer ${offer.id}:`, err.message);
            }
        }
        
        // Process backgroundImage
        if (offer.backgroundImage && offer.backgroundImage.includes('firebasestorage.googleapis.com')) {
            console.log(`Downloading backgroundImage for offer ${offer.id}...`);
            // Check if both urls are exactly the same (very common in Firebase setup)
            if (offer.imageUrl === offer.backgroundImage && updateData.imageUrl) {
                updateData.backgroundImage = updateData.imageUrl;
                updated = true;
                console.log(`backgroundImage is same as imageUrl for offer ${offer.id}, reusing file.`);
            } else {
                const filename = generateFilename(offer.id, 'bg');
                const destPath = path.join(uploadsDir, filename);
                try {
                    await downloadImage(offer.backgroundImage, destPath);
                    updateData.backgroundImage = `/uploads/${filename}`;
                    updated = true;
                } catch (err) {
                    console.error(`Failed to download backgroundImage for offer ${offer.id}:`, err.message);
                }
            }
        }
        
        if (updated) {
            await prisma.offer.update({
                where: { id: offer.id },
                data: updateData
            });
            console.log(`Updated offer ${offer.id} with new local image paths.`);
            updatedCount++;
        }
    }
    
    console.log(`Migration complete! Updated ${updatedCount} offers.`);
    await prisma.$disconnect();
}

run().catch(e => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
});
