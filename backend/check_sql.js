const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkSQL() {
  console.log('--- SQL DATABASE COUNTS ---');
  console.log('Users:', await prisma.user.count());
  console.log('Products:', await prisma.product.count());
  console.log('Categories:', await prisma.category.count());
  console.log('Orders:', await prisma.order.count());
  console.log('Order Items:', await prisma.orderItem.count());
  console.log('Campaigns:', await prisma.campaign.count());
  console.log('Offers:', await prisma.offer.count());
  // 'configuracion' is not in Prisma schema currently? Let's check schema.
  await prisma.$disconnect();
}

checkSQL().catch(console.error);
