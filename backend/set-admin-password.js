// Da rol de administrador y una contraseña a un usuario existente.
// Uso: node set-admin-password.js <email> <contraseña>
require('dotenv').config();
const bcrypt = require('bcryptjs');
const { prisma } = require('./src/config/prisma');

async function setAdminPassword(email, plain) {
    if (!email || !plain || plain.length < 8) {
        console.error('Uso: node set-admin-password.js <email> <contraseña de 8 caracteres o más>');
        process.exitCode = 1;
        return;
    }
    const password = await bcrypt.hash(plain, 10);
    await prisma.user.update({ where: { email }, data: { password, role: 'admin' } });
    console.log(`Contraseña y rol de administrador asignados a ${email}`);
}

setAdminPassword(process.argv[2], process.argv[3])
    .catch((e) => { console.error(e.code === 'P2025' ? 'No existe ningún usuario con ese email.' : e); process.exitCode = 1; })
    .finally(() => prisma.$disconnect());
