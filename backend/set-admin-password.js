const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

async function setAdminPassword() {
    const email = 'jcrenfe@gmail.com';
    const password = await bcrypt.hash('admin123', 10);
    
    await prisma.user.update({
        where: { email },
        data: { password, role: 'admin' }
    });
    
    console.log(`Set password 'admin123' and role 'admin' for: ${email}`);
}

setAdminPassword()
  .catch(console.error)
  .finally(() => process.exit(0)); // avoid the disconnect parsing issue
