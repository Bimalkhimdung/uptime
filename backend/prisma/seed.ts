import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const email = 'bimal@uptime.local';
  const password = await bcrypt.hash('password', 12);

  const user = await prisma.user.upsert({
    where: { email },
    update: { password, name: 'bimal', username: 'bimal' },
    create: { email, password, name: 'bimal', username: 'bimal' },
  });

  console.log(`Seeded user: ${user.email} (id=${user.id})`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
