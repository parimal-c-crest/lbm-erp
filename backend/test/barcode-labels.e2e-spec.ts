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

// No `8-api.md` contract exists for this screen (`9-ui.md` §2 Barcode Label Print) — this task
// designs the shape: a read-only layout projection an Admin (or a real cloud-print integration,
// `1-module.md` §11 — not built, no credentials in this environment) can render from.
describe('Users module — barcode labels (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  // ADR-200 — `Role.id`/`User.id` are internal bigint, only used for this test's own direct Prisma
  // setup/teardown calls. `userPublicId` is the wire-facing UUID sent over HTTP and matched against
  // the barcode-label response's own `userId` field (which the service sets to `user.publicId`).
  let roleId: bigint;
  let adminRoleId: bigint;
  let userPublicId: string;
  let adminAccessToken: string;
  let staffAccessToken: string;

  const staffUsername = 'e2e-barcode-staff';
  const adminUsername = 'e2e-barcode-admin';
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
    const role = await prisma.role.create({ data: { name: 'Warehouse Staff', depth: 0 } });
    roleId = role.id;
    const adminRole = await prisma.role.create({ data: { name: 'Admin', depth: 0 } });
    adminRoleId = adminRole.id;

    const passwordHash = await bcrypt.hash(password, 10);
    const staffUser = await prisma.user.create({
      data: {
        firstName: 'Marcus',
        lastName: 'Whitfield',
        username: staffUsername,
        email: 'e2e-barcode-staff@skeleton.local',
        passwordHash,
        roleId,
        status: 'active',
      },
    });
    userPublicId = staffUser.publicId;
    await prisma.user.create({
      data: {
        firstName: 'E2E',
        lastName: 'BarcodeAdmin',
        username: adminUsername,
        email: 'e2e-barcode-admin@skeleton.local',
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
  });

  afterEach(async () => {
    await prisma.user.deleteMany({ where: { username: { in: [staffUsername, adminUsername] } } });
    await prisma.role.deleteMany({ where: { id: { in: [roleId, adminRoleId] } } });
    await app.close();
  });

  it('returns the label layout with barcode value and role name for a 3x2 label', async () => {
    const response = await request(app.getHttpServer())
      .get(`/barcode-labels/${userPublicId}`)
      .query({ size: '3x2' })
      .set('X-Tenant-Subdomain', 'skeleton')
      .set('Authorization', `Bearer ${adminAccessToken}`)
      .expect(200);

    expect(response.body).toMatchObject({
      userId: userPublicId,
      name: 'Marcus Whitfield',
      role: 'Warehouse Staff',
      barcodeValue: staffUsername.toUpperCase(),
      labelSize: '3x2',
      dimensions: { widthInches: 3, heightInches: 2 },
    });
  });

  it('rejects an unknown label size (400)', async () => {
    await request(app.getHttpServer())
      .get(`/barcode-labels/${userPublicId}`)
      .query({ size: '9x9' })
      .set('X-Tenant-Subdomain', 'skeleton')
      .set('Authorization', `Bearer ${adminAccessToken}`)
      .expect(400);
  });

  it('denies a non-Admin from generating a label (403)', async () => {
    await request(app.getHttpServer())
      .get(`/barcode-labels/${userPublicId}`)
      .query({ size: '3x2' })
      .set('X-Tenant-Subdomain', 'skeleton')
      .set('Authorization', `Bearer ${staffAccessToken}`)
      .expect(403);
  });
});
