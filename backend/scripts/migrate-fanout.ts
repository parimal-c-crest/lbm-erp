// Migration fanout (design doc §6, ADR-056): applies the current migration history to skeleton
// first, then every tenant — staged by type (testing -> demo -> live) unless --type filters to
// one. Sequential, halts on first failure so tenants never end up on divergent schema versions.
// Run: `pnpm --filter backend run migrate:fanout [-- --type=testing]`.
import 'dotenv/config';

import { PrismaPg } from '@prisma/adapter-pg';

import { PrismaClient, TenantType } from '../src/generated/prisma/client';
import { runMigrationFanout } from '../src/tenant/migrate-fanout';

const STAGE_ORDER: TenantType[] = ['testing', 'demo', 'live'];

function parseTypeFilter(): TenantType | undefined {
  const arg = process.argv.find((a) => a.startsWith('--type='));
  if (!arg) return undefined;

  const value = arg.split('=')[1];
  if (!STAGE_ORDER.includes(value as TenantType)) {
    throw new Error(`--type must be one of ${STAGE_ORDER.join(', ')}, got: ${value}`);
  }
  return value as TenantType;
}

async function main() {
  const typeFilter = parseTypeFilter();
  const skeletonUrl = process.env.DATABASE_URL;
  if (!skeletonUrl) throw new Error('DATABASE_URL is not set');

  const adapter = new PrismaPg({ connectionString: skeletonUrl });
  const skeleton = new PrismaClient({ adapter });

  console.log('Applying migrations to skeleton...');
  const results = await runMigrationFanout(skeleton, skeletonUrl, typeFilter);
  await skeleton.$disconnect();

  for (const result of results) {
    if (result.status === 'ok') {
      console.log(`${result.subdomain} (${result.type}): OK`);
    } else {
      console.error(`${result.subdomain} (${result.type}): FAILED — ${result.error}`);
    }
  }

  if (results.some((r) => r.status === 'failed')) {
    process.exit(1);
  }
  console.log('\nMigration fanout complete.');
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
