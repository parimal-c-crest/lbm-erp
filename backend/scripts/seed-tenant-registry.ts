// Seeds the local skeleton database's TenantRegistry with the first local tenant
// (`lbm_erp_dev`, repurposed from T-005 — ADR-184). Run: `pnpm --filter backend run seed`.
import 'dotenv/config';

import { PrismaPg } from '@prisma/adapter-pg';

import { PrismaClient } from '../src/generated/prisma/client';

async function main() {
  const demoTenantUrl = process.env.DEMO_TENANT_DATABASE_URL;
  if (!demoTenantUrl) {
    throw new Error('DEMO_TENANT_DATABASE_URL is not set (see backend/.env)');
  }

  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
  const skeleton = new PrismaClient({ adapter });

  await skeleton.tenantRegistry.upsert({
    where: { subdomain: 'demo' },
    update: { databaseUrl: demoTenantUrl },
    create: {
      subdomain: 'demo',
      databaseUrl: demoTenantUrl,
      type: 'demo',
      runtimeMode: 'sandbox',
    },
  });

  console.log(`Seeded TenantRegistry: demo -> ${demoTenantUrl}`);
  await skeleton.$disconnect();
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
