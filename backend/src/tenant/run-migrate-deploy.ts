import { exec } from 'node:child_process';
import path from 'node:path';
import { promisify } from 'node:util';

const execAsync = promisify(exec);

// repo root — `backend/src/tenant` -> repo root (where `prisma/schema.prisma` and
// `prisma.config.ts` live, per T-005/T-022).
const REPO_ROOT = path.resolve(__dirname, '../../..');

// Runs `prisma migrate deploy` against an arbitrary database — shared by tenant provisioning
// (T-024, new database) and migration fanout (T-025, existing databases). Every tenant database
// shares one migration history with skeleton (ADR-056) — this is that mechanism.
export async function runMigrateDeploy(databaseUrl: string): Promise<void> {
  await execAsync('pnpm exec prisma migrate deploy', {
    cwd: REPO_ROOT,
    env: { ...process.env, DATABASE_URL: databaseUrl },
  });
}
