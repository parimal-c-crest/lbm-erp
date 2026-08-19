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

// Real e2e against skeleton Postgres, same convention as `timeclock.e2e-spec.ts`. Exercises the
// Personal-Day→Time-Clock-Record bridge (`8-api.md` POST /personal-days, FR-010) — the whole
// point of this endpoint per the approved docs, not a side effect.
describe('Users module — personal days (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  // ADR-200 — `Role.id`/`User.id` are internal bigint, only used for this test's own direct Prisma
  // setup/teardown calls (and FK columns like `TimeClockRecord.userId`), never sent over the wire.
  let roleId: bigint;
  let userId: bigint;
  let accessToken: string;

  const username = 'e2e-personalday-user';
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
    const role = await prisma.role.create({ data: { name: 'e2e-personalday-role', depth: 0 } });
    roleId = role.id;
    const passwordHash = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: {
        firstName: 'E2E',
        lastName: 'PersonalDay',
        username,
        email: 'e2e-personalday-user@skeleton.local',
        passwordHash,
        roleId,
        status: 'active',
      },
    });
    userId = user.id;

    const login = await request(app.getHttpServer())
      .post('/auth/login')
      .set('X-Tenant-Subdomain', 'skeleton')
      .send({ username, password })
      .expect(201);
    accessToken = (login.body as LoginResponseBody).accessToken!;
  });

  afterEach(async () => {
    await prisma.timeClockRecord.deleteMany({ where: { userId } });
    await prisma.personalDay.deleteMany({ where: { userId } });
    await prisma.user.deleteMany({ where: { id: userId } });
    await prisma.role.deleteMany({ where: { id: roleId } });
    await app.close();
  });

  it('submits a whole-day request and bridges it into a closed TimeClockRecord per day (FR-010)', async () => {
    await request(app.getHttpServer())
      .post('/personal-days')
      .set('X-Tenant-Subdomain', 'skeleton')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        hoursType: 'vacation',
        startDate: '2026-08-10',
        endDate: '2026-08-11',
        dayCount: 2,
      })
      .expect(201);

    const punches = await prisma.timeClockRecord.findMany({
      where: { userId },
      orderBy: { punchDate: 'asc' },
    });
    expect(punches).toHaveLength(2);
    expect(punches[0].hoursType).toBe('vacation');
    expect(punches[0].status).toBe('clock_out');
    expect(punches[0].clockOut).not.toBeNull();
  });

  it('submits a partial-day request with the exact elapsed hours', async () => {
    await request(app.getHttpServer())
      .post('/personal-days')
      .set('X-Tenant-Subdomain', 'skeleton')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        hoursType: 'sick',
        startDate: '2026-08-10',
        startTime: '09:00',
        endTime: '13:00',
      })
      .expect(201);

    const punches = await prisma.timeClockRecord.findMany({ where: { userId } });
    expect(punches).toHaveLength(1);
    const hours = (punches[0].clockOut!.getTime() - punches[0].clockIn.getTime()) / 3_600_000;
    expect(hours).toBe(4);
    expect(punches[0].hoursType).toBe('sick');
  });

  it('rejects a partial-day request where end time precedes start time (400, 6-validation.md §4)', async () => {
    await request(app.getHttpServer())
      .post('/personal-days')
      .set('X-Tenant-Subdomain', 'skeleton')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        hoursType: 'sick',
        startDate: '2026-08-10',
        startTime: '13:00',
        endTime: '09:00',
      })
      .expect(400);
  });
});
