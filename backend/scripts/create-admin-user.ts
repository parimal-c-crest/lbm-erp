// One-off: create a real 'admin' login for the demo tenant, per developer request. Not part of
// the standard seed (`seed-users-demo-data.ts`) — that seed generates usernames from real names
// and doesn't produce a literal `admin` account.
import 'dotenv/config';

import * as bcrypt from 'bcrypt';

import { PrismaClient } from '../src/generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

const BCRYPT_ROUNDS = 12;

async function main() {
  const url = process.env.DEMO_TENANT_DATABASE_URL;
  if (!url) throw new Error('DEMO_TENANT_DATABASE_URL is not set (see backend/.env)');

  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: url }) });

  const adminRole = await prisma.role.findFirst({ where: { name: 'Admin' } });
  if (!adminRole) throw new Error("No 'Admin' role found — run seed-users-demo-data.ts first.");

  const passwordHash = await bcrypt.hash('Admin@123', BCRYPT_ROUNDS);

  const user = await prisma.user.upsert({
    where: { username: 'admin' },
    update: { passwordHash, roleId: adminRole.id, status: 'active', failedLoginCount: 0, lockedUntil: null },
    create: {
      username: 'admin',
      email: 'admin@lbm.local',
      passwordHash,
      roleId: adminRole.id,
      firstName: 'Admin',
      lastName: 'User',
      status: 'active',
    },
  });

  console.log(`User 'admin' ready (id: ${user.id}, role: Admin, 2FA required per this role).`);
  await prisma.$disconnect();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
