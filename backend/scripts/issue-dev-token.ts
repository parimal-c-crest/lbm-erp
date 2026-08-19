// Dev-only stopgap: prints a JWT for skeleton's bootstrap Super Admin so the T-027 control panel
// can be exercised locally before real login exists (Users module, M3, per auth.module.ts).
// Paste the printed token into the control panel's "dev token" box.
// Run: `pnpm --filter backend run issue-dev-token`.
import 'dotenv/config';

import { JwtService } from '@nestjs/jwt';
import { PrismaPg } from '@prisma/adapter-pg';
import * as bcrypt from 'bcrypt';

import type { JwtPayload } from '../src/auth/jwt.strategy';
import { PrismaClient } from '../src/generated/prisma/client';

const BCRYPT_COST_FACTOR = 12;
const DEV_SUPER_ADMIN_EMAIL = 'dev-super-admin@skeleton.local';

async function main() {
  const skeletonUrl = process.env.DATABASE_URL;
  if (!skeletonUrl) throw new Error('DATABASE_URL is not set');

  const secret = process.env.JWT_ACCESS_SECRET;
  if (!secret) throw new Error('JWT_ACCESS_SECRET is not set');

  const adapter = new PrismaPg({ connectionString: skeletonUrl });
  const skeleton = new PrismaClient({ adapter });

  let superAdmin = await skeleton.user.findFirst({ where: { isSuperAdmin: true } });
  if (!superAdmin) {
    // Nothing bootstraps skeleton's own Super Admin today (T-024 only creates one per newly
    // provisioned tenant) — dev-only convenience so this stopgap is usable without a manual
    // psql insert. Real bootstrap belongs to the Users module (M3).
    console.log(`No Super Admin found in skeleton — creating dev one (${DEV_SUPER_ADMIN_EMAIL}).`);
    const passwordHash = await bcrypt.hash('dev-super-admin-password', BCRYPT_COST_FACTOR);
    superAdmin = await skeleton.user.create({
      data: {
        email: DEV_SUPER_ADMIN_EMAIL,
        username: 'dev-super-admin',
        firstName: 'Dev',
        lastName: 'SuperAdmin',
        passwordHash,
        isSuperAdmin: true,
      },
    });
    await skeleton.user.update({
      where: { id: superAdmin.id },
      data: { createdBy: superAdmin.id, updatedBy: superAdmin.id },
    });
  }

  // Super Admin is a structurally separate axis from the Role catalog (ADR-057) — no `roleId`,
  // so the JWT's `role` claim is just the fixed label this script's own token represents.
  // `sub` is the User's `public_id` (ADR-200) — a JWT is client-decodable, so only the external
  // UUID identity is ever placed in it, matching `AuthService`'s own convention.
  const payload: JwtPayload = { sub: superAdmin.publicId, tenant: 'skeleton', role: 'Super Admin' };
  const jwtService = new JwtService();
  const token = jwtService.sign(payload, { secret, expiresIn: '30d' });

  console.log(token);
  await skeleton.$disconnect();
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
