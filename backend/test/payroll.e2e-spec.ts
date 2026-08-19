import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import * as bcrypt from 'bcrypt';
import request from 'supertest';
import type { App } from 'supertest/types';

import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

interface LoginResponseBody {
  accessToken?: string;
}

interface PayrollRow {
  userId: string;
  regular: number;
  holiday: number;
  personal: number;
  sick: number;
  vacation: number;
  overtime: number;
  status: 'complete' | 'needs_resolution';
}

// Real e2e against the skeleton Postgres database, same convention as `timeclock.e2e-spec.ts`.
describe('Users module — payroll report (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  // ADR-200 — `Role.id`/`User.id` are internal bigint, only used for this test's own direct Prisma
  // setup/teardown calls (and FK columns like `TimeClockRecord.userId`), never sent over the wire.
  let roleId: bigint;
  let adminRoleId: bigint;
  let userId: bigint;
  // `User.publicId` — what the payroll report's response rows key on (`row.userId`).
  let userPublicId: string;
  let accessToken: string;
  let adminAccessToken: string;

  const username = 'e2e-payroll-user';
  const adminUsername = 'e2e-payroll-admin';
  const password = 'CorrectHorse1';

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
    );
    await app.init();

    prisma = app.get(PrismaService);
    const role = await prisma.role.create({ data: { name: 'e2e-payroll-staff', depth: 0 } });
    roleId = role.id;
    const adminRole = await prisma.role.create({ data: { name: 'Admin', depth: 0 } });
    adminRoleId = adminRole.id;

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: {
        firstName: 'E2E',
        lastName: 'Payroll',
        username,
        email: 'e2e-payroll-user@skeleton.local',
        passwordHash,
        roleId,
        status: 'active',
      },
    });
    userId = user.id;
    userPublicId = user.publicId;
    const adminUser = await prisma.user.create({
      data: {
        firstName: 'E2E',
        lastName: 'PayrollAdmin',
        username: adminUsername,
        email: 'e2e-payroll-admin@skeleton.local',
        passwordHash,
        roleId: adminRoleId,
        status: 'active',
      },
    });

    const login = await request(app.getHttpServer())
      .post('/auth/login')
      .set('X-Tenant-Subdomain', 'skeleton')
      .send({ username, password })
      .expect(201);
    accessToken = (login.body as LoginResponseBody).accessToken!;

    const adminLogin = await request(app.getHttpServer())
      .post('/auth/login')
      .set('X-Tenant-Subdomain', 'skeleton')
      .send({ username: adminUsername, password })
      .expect(201);
    adminAccessToken = (adminLogin.body as LoginResponseBody).accessToken!;

    // afterEach also needs adminUser's id — stash it on the outer scope via prisma lookup isn't
    // needed since we clean up by role/email pattern instead.
    void adminUser;
  });

  afterEach(async () => {
    await prisma.personalDay.deleteMany({ where: { user: { username: { in: [username] } } } });
    await prisma.timeClockRecord.deleteMany({ where: { user: { username: { in: [username] } } } });
    await prisma.user.deleteMany({ where: { username: { in: [username, adminUsername] } } });
    await prisma.role.deleteMany({ where: { id: { in: [roleId, adminRoleId] } } });
    await app.close();
  });

  it('sums closed regular punches within the date range', async () => {
    await prisma.timeClockRecord.create({
      data: {
        userId,
        clockIn: new Date('2026-08-10T13:00:00Z'),
        clockOut: new Date('2026-08-10T21:00:00Z'),
        punchDate: new Date('2026-08-10'),
        status: 'clock_out',
        hoursType: 'regular',
      },
    });

    const response = await request(app.getHttpServer())
      .get('/payroll/report')
      .query({ start: '2026-08-01', end: '2026-08-31' })
      .set('X-Tenant-Subdomain', 'skeleton')
      .set('Authorization', `Bearer ${adminAccessToken}`)
      .expect(200);

    const row = (response.body as { rows: PayrollRow[] }).rows.find(
      (r) => r.userId === userPublicId,
    );
    expect(row?.regular).toBe(8);
    expect(row?.status).toBe('complete');
  });

  it('flags a row as needs_resolution and excludes the open punch from the sum', async () => {
    await prisma.timeClockRecord.create({
      data: {
        userId,
        clockIn: new Date('2026-08-10T13:00:00Z'),
        clockOut: null,
        punchDate: new Date('2026-08-10'),
        status: 'unclosed_needs_resolution',
        hoursType: 'regular',
      },
    });

    const response = await request(app.getHttpServer())
      .get('/payroll/report')
      .query({ start: '2026-08-01', end: '2026-08-31' })
      .set('X-Tenant-Subdomain', 'skeleton')
      .set('Authorization', `Bearer ${adminAccessToken}`)
      .expect(200);

    const row = (response.body as { rows: PayrollRow[] }).rows.find(
      (r) => r.userId === userPublicId,
    );
    expect(row?.status).toBe('needs_resolution');
    expect(row?.regular).toBe(0);
  });

  it('computes overtime as hours beyond 40 in a calendar week (ADR-036)', async () => {
    // Mon 2026-08-10 through Fri 2026-08-14, 9 hours/day closed regular punches = 45 hours.
    const days = ['08-10', '08-11', '08-12', '08-13', '08-14'];
    for (const day of days) {
      await prisma.timeClockRecord.create({
        data: {
          userId,
          clockIn: new Date(`2026-${day}T12:00:00Z`),
          clockOut: new Date(`2026-${day}T21:00:00Z`),
          punchDate: new Date(`2026-${day}`),
          status: 'clock_out',
          hoursType: 'regular',
        },
      });
    }

    const response = await request(app.getHttpServer())
      .get('/payroll/report')
      .query({ start: '2026-08-01', end: '2026-08-31' })
      .set('X-Tenant-Subdomain', 'skeleton')
      .set('Authorization', `Bearer ${adminAccessToken}`)
      .expect(200);

    const row = (response.body as { rows: PayrollRow[] }).rows.find(
      (r) => r.userId === userPublicId,
    );
    expect(row?.regular).toBe(45);
    expect(row?.overtime).toBe(5);
  });

  it('sums non-regular hours-types the same way — the Personal-Day bridge (T-057) writes into this same table', async () => {
    // `PersonalDaysService` bridges a submission into a real `TimeClockRecord` at submission
    // time (`8-api.md` POST /personal-days) — this report never reads `PersonalDay` directly, so
    // simulating that bridge's output here is what proves the report handles every `hoursType`
    // uniformly, not just `regular`.
    await prisma.timeClockRecord.create({
      data: {
        userId,
        clockIn: new Date('2026-08-10T09:00:00Z'),
        clockOut: new Date('2026-08-10T17:00:00Z'),
        punchDate: new Date('2026-08-10'),
        status: 'clock_out',
        hoursType: 'vacation',
      },
    });

    const response = await request(app.getHttpServer())
      .get('/payroll/report')
      .query({ start: '2026-08-01', end: '2026-08-31' })
      .set('X-Tenant-Subdomain', 'skeleton')
      .set('Authorization', `Bearer ${adminAccessToken}`)
      .expect(200);

    const row = (response.body as { rows: PayrollRow[] }).rows.find(
      (r) => r.userId === userPublicId,
    );
    expect(row?.vacation).toBe(8);
  });

  it('denies a non-Admin/Accounting role (403)', async () => {
    await request(app.getHttpServer())
      .get('/payroll/report')
      .query({ start: '2026-08-01', end: '2026-08-31' })
      .set('X-Tenant-Subdomain', 'skeleton')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(403);
  });
});
