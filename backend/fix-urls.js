const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fix() {
    console.log('Fixing product image URLs to be relative...');
    let count = 0;
    const prods = await prisma.product.findMany();
    for (const p of prods) {
        if (p.local_image_path && p.local_image_path.startsWith('http://localhost:3500')) {
            const relativePath = p.local_image_path.replace('http://localhost:3500', '');
            await prisma.product.update({
                where: {id: p.id},
                data: { local_image_path: relativePath }
            });
            count++;
        }
    }
    console.log(`Done fixing ${count} URLs to relative.`);
}

fix()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
