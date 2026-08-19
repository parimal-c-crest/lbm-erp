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

describe('Users module — mail account (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  // ADR-200 — `Role.id` is a normal dual-key model's internal bigint. `MailAccount` is one of the
  // documented exceptions with no `publicId` at all — its PK is `userId` itself (`User.id`,
  // internal bigint) — so `userId` here stays bigint throughout, matching `mail-accounts.service.ts`.
  let roleId: bigint;
  let userId: bigint;
  let accessToken: string;

  const username = 'e2e-mailaccount-user';
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
    const role = await prisma.role.create({ data: { name: 'e2e-mailaccount-role', depth: 0 } });
    roleId = role.id;
    const passwordHash = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: {
        firstName: 'E2E',
        lastName: 'MailAccount',
        username,
        email: 'e2e-mailaccount-user@skeleton.local',
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
    await prisma.mailAccount.deleteMany({ where: { userId } });
    await prisma.user.deleteMany({ where: { id: userId } });
    await prisma.role.deleteMany({ where: { id: roleId } });
    await app.close();
  });

  it('creates the own mail account on first save, then updates it in place', async () => {
    await request(app.getHttpServer())
      .put('/users/me/mail-account')
      .set('X-Tenant-Subdomain', 'skeleton')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ displayName: 'E2E User', replyToEmail: 'reply@skeleton.local', signature: 'Thanks' })
      .expect(200);

    const created = await prisma.mailAccount.findUnique({ where: { userId } });
    expect(created?.displayName).toBe('E2E User');

    await request(app.getHttpServer())
      .put('/users/me/mail-account')
      .set('X-Tenant-Subdomain', 'skeleton')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ displayName: 'E2E Updated', replyToEmail: 'reply@skeleton.local' })
      .expect(200);

    const updated = await prisma.mailAccount.findUnique({ where: { userId } });
    expect(updated?.displayName).toBe('E2E Updated');
  });

  it('reads back the own mail account', async () => {
    await prisma.mailAccount.create({
      data: { userId, displayName: 'E2E User', replyToEmail: 'reply@skeleton.local' },
    });

    const response = await request(app.getHttpServer())
      .get('/users/me/mail-account')
      .set('X-Tenant-Subdomain', 'skeleton')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect((response.body as { displayName: string }).displayName).toBe('E2E User');
  });
});
