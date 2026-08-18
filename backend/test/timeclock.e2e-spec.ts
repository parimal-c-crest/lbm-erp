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

// Real e2e against the skeleton Postgres database — same convention as
// `users-auth.e2e-spec.ts` (exercises ValidationPipe/JwtAuthGuard/RolesGuard for real, not mocked).
describe('Users module — timeclock (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let roleId: string;
  let adminRoleId: string;
  let userId: string;
  let adminUserId: string;
  let accessToken: string;
  let adminAccessToken: string;

  const username = 'e2e-timeclock-user';
  const adminUsername = 'e2e-timeclock-admin';
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

    const role = await prisma.role.create({ data: { name: 'e2e-timeclock-staff', depth: 0 } });
    roleId = role.id;
    const adminRole = await prisma.role.create({ data: { name: 'Admin', depth: 0 } });
    adminRoleId = adminRole.id;

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: {
        firstName: 'E2E',
        lastName: 'Timeclock',
        username,
        email: 'e2e-timeclock-user@skeleton.local',
        passwordHash,
        roleId,
        status: 'active',
      },
    });
    userId = user.id;
    const adminUser = await prisma.user.create({
      data: {
        firstName: 'E2E',
        lastName: 'Admin',
        username: adminUsername,
        email: 'e2e-timeclock-admin@skeleton.local',
        passwordHash,
        roleId: adminRoleId,
        status: 'active',
      },
    });
    adminUserId = adminUser.id;

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
  });

  afterEach(async () => {
    await prisma.clockInTaskDetail.deleteMany({
      where: { timeClockRecord: { userId: { in: [userId, adminUserId] } } },
    });
    await prisma.timeClockRecord.deleteMany({ where: { userId: { in: [userId, adminUserId] } } });
    await prisma.user.deleteMany({ where: { id: { in: [userId, adminUserId] } } });
    await prisma.role.deleteMany({ where: { id: { in: [roleId, adminRoleId] } } });
    await app.close();
  });

  it('clocks in and creates an open punch', async () => {
    const response = await request(app.getHttpServer())
      .post('/timeclock/clock-in')
      .set('X-Tenant-Subdomain', 'skeleton')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ task: 'Receiving — PO-4821', laborStatus: 'working' })
      .expect(201);

    expect(response.body).toMatchObject({ userId, status: 'clock_in', clockOut: null });

    const record = await prisma.timeClockRecord.findFirst({ where: { userId } });
    expect(record?.status).toBe('clock_in');
    expect(record?.clockOut).toBeNull();
  });

  it('rejects a second clock-in while a punch is already open (409)', async () => {
    await request(app.getHttpServer())
      .post('/timeclock/clock-in')
      .set('X-Tenant-Subdomain', 'skeleton')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({})
      .expect(201);

    await request(app.getHttpServer())
      .post('/timeclock/clock-in')
      .set('X-Tenant-Subdomain', 'skeleton')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({})
      .expect(409);
  });

  it('clocks out and closes the open punch', async () => {
    await request(app.getHttpServer())
      .post('/timeclock/clock-in')
      .set('X-Tenant-Subdomain', 'skeleton')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({})
      .expect(201);

    const response = await request(app.getHttpServer())
      .post('/timeclock/clock-out')
      .set('X-Tenant-Subdomain', 'skeleton')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({})
      .expect(201);

    expect((response.body as { status: string }).status).toBe('clock_out');
    expect((response.body as { clockOut: string | null }).clockOut).not.toBeNull();
  });

  it('rejects clock-out when there is no open punch (404)', async () => {
    await request(app.getHttpServer())
      .post('/timeclock/clock-out')
      .set('X-Tenant-Subdomain', 'skeleton')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({})
      .expect(404);
  });

  it('lets an Admin override a punch, correcting its timestamps', async () => {
    const punch = await prisma.timeClockRecord.create({
      data: {
        userId,
        clockIn: new Date('2026-08-17T13:00:00Z'),
        clockOut: new Date('2026-08-17T21:00:00Z'),
        punchDate: new Date('2026-08-17'),
        status: 'clock_out',
      },
    });

    await request(app.getHttpServer())
      .post(`/timeclock/override/${punch.id}/lock`)
      .set('X-Tenant-Subdomain', 'skeleton')
      .set('Authorization', `Bearer ${adminAccessToken}`)
      .expect(201);

    const response = await request(app.getHttpServer())
      .post('/timeclock/override')
      .set('X-Tenant-Subdomain', 'skeleton')
      .set('Authorization', `Bearer ${adminAccessToken}`)
      .send({
        recordId: punch.id,
        clockIn: '2026-08-17T12:55:00Z',
        clockOut: '2026-08-17T21:05:00Z',
      })
      .expect(201);

    expect((response.body as { clockIn: string }).clockIn).toBe('2026-08-17T12:55:00.000Z');
  });

  it('rejects an override where clock-out precedes clock-in (400)', async () => {
    const punch = await prisma.timeClockRecord.create({
      data: {
        userId,
        clockIn: new Date('2026-08-17T13:00:00Z'),
        clockOut: new Date('2026-08-17T21:00:00Z'),
        punchDate: new Date('2026-08-17'),
        status: 'clock_out',
      },
    });

    await request(app.getHttpServer())
      .post(`/timeclock/override/${punch.id}/lock`)
      .set('X-Tenant-Subdomain', 'skeleton')
      .set('Authorization', `Bearer ${adminAccessToken}`)
      .expect(201);

    await request(app.getHttpServer())
      .post('/timeclock/override')
      .set('X-Tenant-Subdomain', 'skeleton')
      .set('Authorization', `Bearer ${adminAccessToken}`)
      .send({
        recordId: punch.id,
        clockIn: '2026-08-17T21:00:00Z',
        clockOut: '2026-08-17T13:00:00Z',
      })
      .expect(400);
  });

  it('denies a non-Admin/Accounting role from overriding a punch (403)', async () => {
    const punch = await prisma.timeClockRecord.create({
      data: {
        userId,
        clockIn: new Date('2026-08-17T13:00:00Z'),
        punchDate: new Date('2026-08-17'),
        status: 'clock_in',
      },
    });

    await request(app.getHttpServer())
      .post('/timeclock/override')
      .set('X-Tenant-Subdomain', 'skeleton')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        recordId: punch.id,
        clockIn: '2026-08-17T13:00:00Z',
        clockOut: '2026-08-17T21:00:00Z',
      })
      .expect(403);
  });
});
