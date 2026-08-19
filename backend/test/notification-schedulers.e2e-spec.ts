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

// Minimal backend-only CRUD (ADR-188 — no dedicated UI in this MVP). No endpoint contract exists
// in `8-api.md` for this entity (flagged, `4-schema.md` never got one either) — this test defines
// the REST shape this task designs: `/notification-schedulers` mirrors the project's existing
// simple-CRUD convention (Groups module).
describe('Users module — notification schedulers (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  // ADR-200 — `Role.id` is internal bigint, only used for this test's own direct Prisma setup/
  // teardown calls, never sent over the wire.
  let adminRoleId: bigint;
  let staffRoleId: bigint;
  let adminAccessToken: string;
  let staffAccessToken: string;
  // `NotificationScheduler` publicIds (UUIDs) returned from HTTP responses — cleanup below matches
  // on `publicId`, not the internal bigint `id`.
  let createdIds: string[] = [];

  const adminUsername = 'e2e-notifsched-admin';
  const staffUsername = 'e2e-notifsched-staff';
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
    const staffRole = await prisma.role.create({
      data: { name: 'e2e-notifsched-staff-role', depth: 0 },
    });
    staffRoleId = staffRole.id;

    const passwordHash = await bcrypt.hash(password, 10);
    await prisma.user.create({
      data: {
        firstName: 'E2E',
        lastName: 'NotifAdmin',
        username: adminUsername,
        email: 'e2e-notifsched-admin@skeleton.local',
        passwordHash,
        roleId: adminRoleId,
        status: 'active',
      },
    });
    await prisma.user.create({
      data: {
        firstName: 'E2E',
        lastName: 'NotifStaff',
        username: staffUsername,
        email: 'e2e-notifsched-staff@skeleton.local',
        passwordHash,
        roleId: staffRoleId,
        status: 'active',
      },
    });

    const adminLogin = await request(app.getHttpServer())
      .post('/auth/login')
      .set('X-Tenant-Subdomain', 'skeleton')
      .send({ username: adminUsername, password })
      .expect(201);
    adminAccessToken = (adminLogin.body as LoginResponseBody).accessToken!;

    const staffLogin = await request(app.getHttpServer())
      .post('/auth/login')
      .set('X-Tenant-Subdomain', 'skeleton')
      .send({ username: staffUsername, password })
      .expect(201);
    staffAccessToken = (staffLogin.body as LoginResponseBody).accessToken!;

    createdIds = [];
  });

  afterEach(async () => {
    await prisma.notificationScheduler.deleteMany({ where: { publicId: { in: createdIds } } });
    await prisma.user.deleteMany({ where: { username: { in: [adminUsername, staffUsername] } } });
    await prisma.role.deleteMany({ where: { id: { in: [adminRoleId, staffRoleId] } } });
    await app.close();
  });

  it('lets an Admin create, list, update, and delete a scheduler', async () => {
    const created = await request(app.getHttpServer())
      .post('/notification-schedulers')
      .set('X-Tenant-Subdomain', 'skeleton')
      .set('Authorization', `Bearer ${adminAccessToken}`)
      .send({ name: 'Nightly digest', cronExpression: '0 2 * * *' })
      .expect(201);
    const id = (created.body as { id: string }).id;
    createdIds.push(id);

    const list = await request(app.getHttpServer())
      .get('/notification-schedulers')
      .set('X-Tenant-Subdomain', 'skeleton')
      .set('Authorization', `Bearer ${adminAccessToken}`)
      .expect(200);
    expect((list.body as { id: string }[]).some((s) => s.id === id)).toBe(true);

    await request(app.getHttpServer())
      .patch(`/notification-schedulers/${id}`)
      .set('X-Tenant-Subdomain', 'skeleton')
      .set('Authorization', `Bearer ${adminAccessToken}`)
      .send({ enabled: false })
      .expect(200);
    const disabled = await prisma.notificationScheduler.findUnique({ where: { publicId: id } });
    expect(disabled?.enabled).toBe(false);

    await request(app.getHttpServer())
      .delete(`/notification-schedulers/${id}`)
      .set('X-Tenant-Subdomain', 'skeleton')
      .set('Authorization', `Bearer ${adminAccessToken}`)
      .expect(200);
    expect(await prisma.notificationScheduler.findUnique({ where: { publicId: id } })).toBeNull();
    createdIds = [];
  });

  it('denies a non-Admin from creating a scheduler (403)', async () => {
    await request(app.getHttpServer())
      .post('/notification-schedulers')
      .set('X-Tenant-Subdomain', 'skeleton')
      .set('Authorization', `Bearer ${staffAccessToken}`)
      .send({ name: 'Nightly digest', cronExpression: '0 2 * * *' })
      .expect(403);
  });
});
