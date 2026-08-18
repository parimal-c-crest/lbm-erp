import { Test, TestingModule } from '@nestjs/testing';

import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { TimeclockAutoCloseService } from '../src/users/timeclock/auto-close.service';

function daysAgo(days: number): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - days));
}

// Auto-clock-out safety net (`3-business-rules.md` §7, ADR-037) — never guesses a clock-out
// time, only flips a stale open punch to `unclosed_needs_resolution` for manager review.
describe('Users module — timeclock auto-close sweep (e2e)', () => {
  let moduleRef: TestingModule;
  let prisma: PrismaService;
  let autoClose: TimeclockAutoCloseService;
  let roleId: string;
  let userId: string;

  beforeEach(async () => {
    moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    const app = moduleRef.createNestApplication();
    await app.init();

    prisma = moduleRef.get(PrismaService);
    autoClose = moduleRef.get(TimeclockAutoCloseService);

    const role = await prisma.role.create({ data: { name: 'e2e-autoclose-role', depth: 0 } });
    roleId = role.id;
    const user = await prisma.user.create({
      data: {
        firstName: 'E2E',
        lastName: 'AutoClose',
        username: 'e2e-autoclose-user',
        email: 'e2e-autoclose-user@skeleton.local',
        passwordHash: 'x',
        roleId,
        status: 'active',
      },
    });
    userId = user.id;
  });

  afterEach(async () => {
    await prisma.timeClockRecord.deleteMany({ where: { userId } });
    await prisma.user.deleteMany({ where: { id: userId } });
    await prisma.role.deleteMany({ where: { id: roleId } });
    await moduleRef.close();
  });

  it('flags a punch left open from a prior day as unclosed_needs_resolution', async () => {
    const stale = await prisma.timeClockRecord.create({
      data: {
        userId,
        clockIn: daysAgo(2),
        punchDate: daysAgo(2),
        status: 'clock_in',
      },
    });

    await autoClose.sweepAllTenants();

    const updated = await prisma.timeClockRecord.findUnique({ where: { id: stale.id } });
    expect(updated?.status).toBe('unclosed_needs_resolution');
    expect(updated?.clockOut).toBeNull();
  });

  it('leaves a punch opened today untouched', async () => {
    const today = new Date(
      Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth(), new Date().getUTCDate()),
    );
    const openToday = await prisma.timeClockRecord.create({
      data: {
        userId,
        clockIn: new Date(),
        punchDate: today,
        status: 'clock_in',
      },
    });

    await autoClose.sweepAllTenants();

    const unchanged = await prisma.timeClockRecord.findUnique({ where: { id: openToday.id } });
    expect(unchanged?.status).toBe('clock_in');
  });
});
