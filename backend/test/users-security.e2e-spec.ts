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

// T-064 traceability pass against `11-testing.md` §12 Security Tests — closes the module's own
// highest-priority named gaps that had zero test coverage anywhere in this session's work
// (checked via a grep across every `*.e2e-spec.ts` file before writing this one). Not a re-test
// of everything §12 lists — items already covered elsewhere (login lockout in
// `users-auth.e2e-spec.ts`, permission-escalation 403s throughout every other spec file) are
// noted in `tasks/T-064-todos.md`, not duplicated here.
describe('Users module — security regression tests (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let adminRoleId: string;
  let adminAccessToken: string;
  let createdUserIds: string[] = [];

  const adminUsername = 'e2e-security-admin';
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
    const adminUser = await prisma.user.create({
      data: {
        firstName: 'E2E',
        lastName: 'SecurityAdmin',
        username: adminUsername,
        email: 'e2e-security-admin@skeleton.local',
        passwordHash,
        roleId: adminRoleId,
        status: 'active',
      },
    });
    createdUserIds = [adminUser.id];

    const login = await request(app.getHttpServer())
      .post('/auth/login')
      .set('X-Tenant-Subdomain', 'skeleton')
      .send({ username: adminUsername, password })
      .expect(201);
    adminAccessToken = (login.body as LoginResponseBody).accessToken!;
  });

  afterEach(async () => {
    await prisma.timeClockRecord.deleteMany({ where: { userId: { in: createdUserIds } } });
    await prisma.user.deleteMany({ where: { id: { in: createdUserIds } } });
    await prisma.role.deleteMany({ where: { id: adminRoleId } });
    await app.close();
  });

  // BR-001's own worked example (`3-business-rules.md`) — the traced root cause of a real prior
  // data-loss incident (USR-RISK-001). Rejected before any query construction, not merely
  // guarded against deep in a query.
  it('rejects a delete request with a malformed/empty id before any query construction (USR-RISK-001)', async () => {
    const response = await request(app.getHttpServer())
      .delete('/users/not-a-real-uuid')
      .set('X-Tenant-Subdomain', 'skeleton')
      .set('Authorization', `Bearer ${adminAccessToken}`)
      .send({ transferToUserId: createdUserIds[0] })
      .expect(400);

    expect((response.body as { message: string }).message).toContain('valid UUID');
  });

  it('rejects deleting the organization-s last remaining Admin (USR-RISK-020)', async () => {
    await request(app.getHttpServer())
      .delete(`/users/${createdUserIds[0]}`)
      .set('X-Tenant-Subdomain', 'skeleton')
      .set('Authorization', `Bearer ${adminAccessToken}`)
      .send({ transferToUserId: createdUserIds[0] })
      .expect(409);
  });

  it('rejects creating a user with a duplicate username (USR-RULE-001)', async () => {
    await request(app.getHttpServer())
      .post('/users')
      .set('X-Tenant-Subdomain', 'skeleton')
      .set('Authorization', `Bearer ${adminAccessToken}`)
      .send({
        firstName: 'Dup',
        lastName: 'User',
        username: adminUsername, // collides with the seeded admin
        email: 'e2e-security-dup@skeleton.local',
        password: 'CorrectHorse1',
        roleId: adminRoleId,
      })
      .expect(409);
  });

  // Prisma parameterizes every query it builds — this proves it end-to-end through the real HTTP
  // + service + DB path, not just "the ORM is generally safe" (USR-RISK-002/003).
  it('stores a SQL-injection-shaped task string as inert literal text, not executed (USR-RISK-002/003)', async () => {
    const injectionPayload = "Receiving'; DROP TABLE users; --";

    const response = await request(app.getHttpServer())
      .post('/timeclock/clock-in')
      .set('X-Tenant-Subdomain', 'skeleton')
      .set('Authorization', `Bearer ${adminAccessToken}`)
      .send({ task: injectionPayload, laborStatus: 'working' })
      .expect(201);

    const stillHasUsersTable = await prisma.user.findUnique({ where: { id: createdUserIds[0] } });
    expect(stillHasUsersTable).not.toBeNull();

    const record = await prisma.timeClockRecord.findUnique({
      where: { id: (response.body as { id: string }).id },
      include: { taskDetails: true },
    });
    expect(record?.taskDetails[0]?.task).toBe(injectionPayload);

    await prisma.timeClockRecord.delete({ where: { id: record!.id } });
  });
});
