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

describe('Users module — login history (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let roleId: string;
  let adminRoleId: string;
  let adminAccessToken: string;
  let staffAccessToken: string;

  const staffUsername = 'e2e-loginhistory-staff';
  const adminUsername = 'e2e-loginhistory-admin';
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
    const role = await prisma.role.create({ data: { name: 'e2e-loginhistory-role', depth: 0 } });
    roleId = role.id;
    const adminRole = await prisma.role.create({ data: { name: 'Admin', depth: 0 } });
    adminRoleId = adminRole.id;

    const passwordHash = await bcrypt.hash(password, 10);
    await prisma.user.create({
      data: {
        firstName: 'E2E',
        lastName: 'Staff',
        username: staffUsername,
        email: 'e2e-loginhistory-staff@skeleton.local',
        passwordHash,
        roleId,
        status: 'active',
      },
    });
    await prisma.user.create({
      data: {
        firstName: 'E2E',
        lastName: 'Admin',
        username: adminUsername,
        email: 'e2e-loginhistory-admin@skeleton.local',
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
    await prisma.loginHistory.deleteMany({
      where: { username: { in: [staffUsername, adminUsername] } },
    });
    await prisma.user.deleteMany({ where: { username: { in: [staffUsername, adminUsername] } } });
    await prisma.role.deleteMany({ where: { id: { in: [roleId, adminRoleId] } } });
    await app.close();
  });

  it('lets an Admin list the login-history audit trail, filtered by username', async () => {
    const response = await request(app.getHttpServer())
      .get('/login-history')
      .query({ username: staffUsername })
      .set('X-Tenant-Subdomain', 'skeleton')
      .set('Authorization', `Bearer ${adminAccessToken}`)
      .expect(200);

    const rows = response.body as { username: string; status: string }[];
    expect(rows.length).toBeGreaterThan(0);
    expect(rows.every((r) => r.username === staffUsername)).toBe(true);
    expect(rows[0].status).toBe('success');
  });

  it('denies a non-Admin from reading the audit trail (403)', async () => {
    await request(app.getHttpServer())
      .get('/login-history')
      .set('X-Tenant-Subdomain', 'skeleton')
      .set('Authorization', `Bearer ${staffAccessToken}`)
      .expect(403);
  });
});
