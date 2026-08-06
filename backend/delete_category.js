const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function del() {
    try {
        await prisma.category.delete({ where: { id: 'varios' } });
        console.log('Deleted duplicate category');
    } catch(e) {
        console.log(e);
    }
    await prisma.$disconnect();
}
del();
