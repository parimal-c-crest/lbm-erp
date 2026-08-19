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

// Concurrent-edit lock (ADR-079/080/084) applied to the Time-Card Override screen — the first
// implementation of the project-wide shared lock utility (T-063). Real Redis, real Postgres.
describe('Users module — timeclock override lock (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let adminRoleId: bigint;
  let managerRoleId: bigint;
  let staffRoleId: bigint;
  let adminAccessToken: string;
  let managerAccessToken: string;
  let recordId: string;
  let staffUserId: bigint;

  const adminUsername = 'e2e-lock-admin';
  const managerUsername = 'e2e-lock-manager';
  const staffUsername = 'e2e-lock-staff';
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
    const adminRole = await prisma.role.create({ data: { name: 'Admin', depth: 0 } });
    adminRoleId = adminRole.id;
    const managerRole = await prisma.role.create({
      data: { name: 'Accounting/Management', depth: 0 },
    });
    managerRoleId = managerRole.id;
    const staffRole = await prisma.role.create({ data: { name: 'e2e-lock-staff-role', depth: 0 } });
    staffRoleId = staffRole.id;

    const passwordHash = await bcrypt.hash(password, 10);
    await prisma.user.create({
      data: {
        firstName: 'Ada',
        lastName: 'Admin',
        username: adminUsername,
        email: 'e2e-lock-admin@skeleton.local',
        passwordHash,
        roleId: adminRoleId,
        status: 'active',
      },
    });
    await prisma.user.create({
      data: {
        firstName: 'Mona',
        lastName: 'Manager',
        username: managerUsername,
        email: 'e2e-lock-manager@skeleton.local',
        passwordHash,
        roleId: managerRoleId,
        status: 'active',
      },
    });
    const staffUser = await prisma.user.create({
      data: {
        firstName: 'Sam',
        lastName: 'Staff',
        username: staffUsername,
        email: 'e2e-lock-staff@skeleton.local',
        passwordHash,
        roleId: staffRoleId,
        status: 'active',
      },
    });
    staffUserId = staffUser.id;

    const record = await prisma.timeClockRecord.create({
      data: {
        userId: staffUserId,
        clockIn: new Date('2026-08-17T13:00:00Z'),
        clockOut: new Date('2026-08-17T21:00:00Z'),
        punchDate: new Date('2026-08-17'),
        status: 'clock_out',
      },
    });
    recordId = record.publicId;

    const adminLogin = await request(app.getHttpServer())
      .post('/auth/login')
      .set('X-Tenant-Subdomain', 'skeleton')
      .send({ username: adminUsername, password })
      .expect(201);
    adminAccessToken = (adminLogin.body as LoginResponseBody).accessToken!;

    const managerLogin = await request(app.getHttpServer())
      .post('/auth/login')
      .set('X-Tenant-Subdomain', 'skeleton')
      .send({ username: managerUsername, password })
      .expect(201);
    managerAccessToken = (managerLogin.body as LoginResponseBody).accessToken!;
  });

  afterEach(async () => {
    await prisma.timeClockRecord.deleteMany({ where: { userId: staffUserId } });
    await prisma.user.deleteMany({
      where: { username: { in: [adminUsername, managerUsername, staffUsername] } },
    });
    await prisma.role.deleteMany({
      where: { id: { in: [adminRoleId, managerRoleId, staffRoleId] } },
    });
    await app.close();
  });

  it('lets the first admin acquire the lock, and blocks a second admin with the holder identified', async () => {
    await request(app.getHttpServer())
      .post(`/timeclock/override/${recordId}/lock`)
      .set('X-Tenant-Subdomain', 'skeleton')
      .set('Authorization', `Bearer ${adminAccessToken}`)
      .expect(201)
      .expect(({ body }: { body: { acquired: boolean } }) => {
        if (body.acquired !== true) throw new Error('expected acquired: true');
      });

    const blocked = await request(app.getHttpServer())
      .post(`/timeclock/override/${recordId}/lock`)
      .set('X-Tenant-Subdomain', 'skeleton')
      .set('Authorization', `Bearer ${managerAccessToken}`)
      .expect(409);

    expect((blocked.body as { message: string }).message).toContain('Ada Admin');
  });

  it('rejects an override submitted without holding the lock (409)', async () => {
    await request(app.getHttpServer())
      .post('/timeclock/override')
      .set('X-Tenant-Subdomain', 'skeleton')
      .set('Authorization', `Bearer ${adminAccessToken}`)
      .send({ recordId, clockIn: '2026-08-17T12:55:00Z', clockOut: '2026-08-17T21:05:00Z' })
      .expect(409);
  });

  it('applies the override when the caller holds the lock, then releases it', async () => {
    await request(app.getHttpServer())
      .post(`/timeclock/override/${recordId}/lock`)
      .set('X-Tenant-Subdomain', 'skeleton')
      .set('Authorization', `Bearer ${adminAccessToken}`)
      .expect(201);

    await request(app.getHttpServer())
      .post('/timeclock/override')
      .set('X-Tenant-Subdomain', 'skeleton')
      .set('Authorization', `Bearer ${adminAccessToken}`)
      .send({ recordId, clockIn: '2026-08-17T12:55:00Z', clockOut: '2026-08-17T21:05:00Z' })
      .expect(201);

    // Released on save — a second admin can now acquire it.
    await request(app.getHttpServer())
      .post(`/timeclock/override/${recordId}/lock`)
      .set('X-Tenant-Subdomain', 'skeleton')
      .set('Authorization', `Bearer ${managerAccessToken}`)
      .expect(201);
  });

  it('lets the lock holder release it explicitly (cancel), freeing it immediately', async () => {
    await request(app.getHttpServer())
      .post(`/timeclock/override/${recordId}/lock`)
      .set('X-Tenant-Subdomain', 'skeleton')
      .set('Authorization', `Bearer ${adminAccessToken}`)
      .expect(201);

    await request(app.getHttpServer())
      .delete(`/timeclock/override/${recordId}/lock`)
      .set('X-Tenant-Subdomain', 'skeleton')
      .set('Authorization', `Bearer ${adminAccessToken}`)
      .expect(200);

    await request(app.getHttpServer())
      .post(`/timeclock/override/${recordId}/lock`)
      .set('X-Tenant-Subdomain', 'skeleton')
      .set('Authorization', `Bearer ${managerAccessToken}`)
      .expect(201);
  });

  it('lets the lock holder renew it via heartbeat', async () => {
    await request(app.getHttpServer())
      .post(`/timeclock/override/${recordId}/lock`)
      .set('X-Tenant-Subdomain', 'skeleton')
      .set('Authorization', `Bearer ${adminAccessToken}`)
      .expect(201);

    await request(app.getHttpServer())
      .post(`/timeclock/override/${recordId}/lock/heartbeat`)
      .set('X-Tenant-Subdomain', 'skeleton')
      .set('Authorization', `Bearer ${adminAccessToken}`)
      .expect(201);
  });

  it('denies a non-Admin/Accounting role from acquiring the lock (403)', async () => {
    // Reuse the staff login to prove RolesGuard still applies to the new lock endpoints.
    const staffLogin = await request(app.getHttpServer())
      .post('/auth/login')
      .set('X-Tenant-Subdomain', 'skeleton')
      .send({ username: staffUsername, password })
      .expect(201);
    const staffAccessToken = (staffLogin.body as LoginResponseBody).accessToken!;

    await request(app.getHttpServer())
      .post(`/timeclock/override/${recordId}/lock`)
      .set('X-Tenant-Subdomain', 'skeleton')
      .set('Authorization', `Bearer ${staffAccessToken}`)
      .expect(403);
  });
});
