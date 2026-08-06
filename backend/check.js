const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
    const cats = await prisma.category.findMany();
    console.log(cats);
    await prisma.$disconnect();
}
check();
