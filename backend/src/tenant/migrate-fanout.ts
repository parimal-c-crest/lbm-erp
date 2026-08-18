import type { PrismaClient, TenantType } from '../generated/prisma/client';

import { runMigrateDeploy } from './run-migrate-deploy';

const STAGE_ORDER: TenantType[] = ['testing', 'demo', 'live'];

export interface FanoutResult {
  subdomain: string;
  type: TenantType;
  status: 'ok' | 'failed';
  error?: string;
}

// Shared by the CLI script (`scripts/migrate-fanout.ts`) and the control panel's HTTP trigger
// (T-027, `POST /skeleton/tenants/migrate-fanout`) so the staged-by-type, halt-on-failure
// mechanism (design doc §6, ADR-056) exists in exactly one place.
export async function runMigrationFanout(
  skeleton: Pick<PrismaClient, 'tenantRegistry'>,
  skeletonUrl: string,
  typeFilter?: TenantType,
): Promise<FanoutResult[]> {
  const results: FanoutResult[] = [];

  await runMigrateDeploy(skeletonUrl);

  const stages = typeFilter ? [typeFilter] : STAGE_ORDER;
  for (const type of stages) {
    const tenants = await skeleton.tenantRegistry.findMany({ where: { type } });

    for (const tenant of tenants) {
      try {
        await runMigrateDeploy(tenant.databaseUrl);
        results.push({ subdomain: tenant.subdomain, type, status: 'ok' });
      } catch (error) {
        results.push({
          subdomain: tenant.subdomain,
          type,
          status: 'failed',
          error: error instanceof Error ? error.message : String(error),
        });
        return results;
      }
    }
  }

  return results;
}
