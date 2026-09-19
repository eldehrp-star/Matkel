require('dotenv').config();
const prisma = require('./lib/prisma');
const { hashPin } = require('./lib/auth');

async function main() {
  const name = process.env.SEED_ADMIN_NAME || 'Administrador';
  const username = process.env.SEED_ADMIN_USERNAME || 'admin';
  const pin = process.env.SEED_ADMIN_PIN || '1234';

  const existing = await prisma.staff.findUnique({ where: { username } });
  if (existing) {
    console.log(`Ya existe un usuario "${username}", no se creo ninguno nuevo.`);
    return;
  }

  await prisma.staff.create({
    data: {
      name,
      username,
      pinHash: await hashPin(pin),
      role: 'ADMIN',
    },
  });

  console.log(`Administrador creado: usuario="${username}" pin="${pin}" (cambialo despues de iniciar sesion).`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
