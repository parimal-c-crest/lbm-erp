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

describe('Users module — holidays (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  // ADR-200 — internal bigint ids, used only for this test's own direct Prisma setup/teardown.
  let staffRoleId: bigint;
  let adminRoleId: bigint;
  let staffUserId: bigint;
  let staffUserPublicId: string;
  let staffAccessToken: string;
  let adminAccessToken: string;
  // Response bodies' `id` is the Holiday's publicId (UUID) — cleanup below resolves these back to
  // internal bigint ids before touching HolidayAssignment/Holiday directly via Prisma.
  let createdHolidayPublicIds: string[] = [];

  const staffUsername = 'e2e-holiday-staff';
  const adminUsername = 'e2e-holiday-admin';
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
    const staffRole = await prisma.role.create({
      data: { name: 'e2e-holiday-staff-role', depth: 0 },
    });
    staffRoleId = staffRole.id;
    const adminRole = await prisma.role.create({ data: { name: 'Admin', depth: 0 } });
    adminRoleId = adminRole.id;

    const passwordHash = await bcrypt.hash(password, 10);
    const staffUser = await prisma.user.create({
      data: {
        firstName: 'E2E',
        lastName: 'HolidayStaff',
        username: staffUsername,
        email: 'e2e-holiday-staff@skeleton.local',
        passwordHash,
        roleId: staffRoleId,
        status: 'active',
      },
    });
    staffUserId = staffUser.id;
    staffUserPublicId = staffUser.publicId;
    await prisma.user.create({
      data: {
        firstName: 'E2E',
        lastName: 'HolidayAdmin',
        username: adminUsername,
        email: 'e2e-holiday-admin@skeleton.local',
        passwordHash,
        roleId: adminRoleId,
        status: 'active',
      },
    });

    const staffLogin = await request(app.getHttpServer())
      .post('/auth/login')
      .set('X-Tenant-Subdomain', 'skeleton')
      .send({ username: staffUsername, password })
      .expect(201);
    staffAccessToken = (staffLogin.body as LoginResponseBody).accessToken!;

    const adminLogin = await request(app.getHttpServer())
      .post('/auth/login')
      .set('X-Tenant-Subdomain', 'skeleton')
      .send({ username: adminUsername, password })
      .expect(201);
    adminAccessToken = (adminLogin.body as LoginResponseBody).accessToken!;

    createdHolidayPublicIds = [];
  });

  afterEach(async () => {
    const createdHolidays = await prisma.holiday.findMany({
      where: { publicId: { in: createdHolidayPublicIds } },
      select: { id: true },
    });
    const createdHolidayIds = createdHolidays.map((h) => h.id);
    await prisma.holidayAssignment.deleteMany({ where: { holidayId: { in: createdHolidayIds } } });
    await prisma.holiday.deleteMany({ where: { id: { in: createdHolidayIds } } });
    await prisma.user.deleteMany({ where: { username: { in: [staffUsername, adminUsername] } } });
    await prisma.role.deleteMany({ where: { id: { in: [staffRoleId, adminRoleId] } } });
    await app.close();
  });

  it('lets an Admin create a holiday and assign it to a user', async () => {
    const response = await request(app.getHttpServer())
      .post('/holidays')
      .set('X-Tenant-Subdomain', 'skeleton')
      .set('Authorization', `Bearer ${adminAccessToken}`)
      .send({ name: 'Thanksgiving', date: '2026-11-26', userIds: [staffUserPublicId] })
      .expect(201);

    const holidayPublicId = (response.body as { id: string }).id;
    createdHolidayPublicIds.push(holidayPublicId);

    const holiday = await prisma.holiday.findUniqueOrThrow({ where: { publicId: holidayPublicId } });
    const assignments = await prisma.holidayAssignment.findMany({
      where: { holidayId: holiday.id },
    });
    expect(assignments).toHaveLength(1);
    expect(assignments[0].userId).toBe(staffUserId);
  });

  it('denies a non-Admin from creating a holiday (403)', async () => {
    await request(app.getHttpServer())
      .post('/holidays')
      .set('X-Tenant-Subdomain', 'skeleton')
      .set('Authorization', `Bearer ${staffAccessToken}`)
      .send({ name: 'Thanksgiving', date: '2026-11-26' })
      .expect(403);
  });

  it('lets any authenticated user list the holiday catalog', async () => {
    const created = await request(app.getHttpServer())
      .post('/holidays')
      .set('X-Tenant-Subdomain', 'skeleton')
      .set('Authorization', `Bearer ${adminAccessToken}`)
      .send({ name: 'Independence Day', date: '2026-07-04' })
      .expect(201);
    createdHolidayPublicIds.push((created.body as { id: string }).id);

    const response = await request(app.getHttpServer())
      .get('/holidays')
      .set('X-Tenant-Subdomain', 'skeleton')
      .set('Authorization', `Bearer ${staffAccessToken}`)
      .expect(200);

    const names = (response.body as { name: string }[]).map((h) => h.name);
    expect(names).toContain('Independence Day');
  });
});
