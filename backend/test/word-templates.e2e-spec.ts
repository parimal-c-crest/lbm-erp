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

describe('Users module — word templates (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let adminRoleId: string;
  let adminAccessToken: string;
  let createdIds: string[] = [];

  const adminUsername = 'e2e-wordtemplate-admin';
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

    const passwordHash = await bcrypt.hash(password, 10);
    await prisma.user.create({
      data: {
        firstName: 'E2E',
        lastName: 'WordTemplateAdmin',
        username: adminUsername,
        email: 'e2e-wordtemplate-admin@skeleton.local',
        passwordHash,
        roleId: adminRoleId,
        status: 'active',
      },
    });

    const adminLogin = await request(app.getHttpServer())
      .post('/auth/login')
      .set('X-Tenant-Subdomain', 'skeleton')
      .send({ username: adminUsername, password })
      .expect(201);
    adminAccessToken = (adminLogin.body as LoginResponseBody).accessToken!;

    createdIds = [];
  });

  afterEach(async () => {
    await prisma.wordTemplate.deleteMany({ where: { id: { in: createdIds } } });
    await prisma.user.deleteMany({ where: { username: adminUsername } });
    await prisma.role.deleteMany({ where: { id: adminRoleId } });
    await app.close();
  });

  it('lets an Admin create, list, and delete a word template', async () => {
    const created = await request(app.getHttpServer())
      .post('/word-templates')
      .set('X-Tenant-Subdomain', 'skeleton')
      .set('Authorization', `Bearer ${adminAccessToken}`)
      .send({ name: 'Offer Letter', content: 'Dear {{firstName}},' })
      .expect(201);
    const id = (created.body as { id: string }).id;
    createdIds.push(id);

    const list = await request(app.getHttpServer())
      .get('/word-templates')
      .set('X-Tenant-Subdomain', 'skeleton')
      .set('Authorization', `Bearer ${adminAccessToken}`)
      .expect(200);
    expect((list.body as { id: string }[]).some((t) => t.id === id)).toBe(true);

    await request(app.getHttpServer())
      .delete(`/word-templates/${id}`)
      .set('X-Tenant-Subdomain', 'skeleton')
      .set('Authorization', `Bearer ${adminAccessToken}`)
      .expect(200);
    expect(await prisma.wordTemplate.findUnique({ where: { id } })).toBeNull();
    createdIds = [];
  });
});
