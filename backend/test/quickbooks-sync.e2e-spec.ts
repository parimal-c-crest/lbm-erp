import { getQueueToken } from '@nestjs/bullmq';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import * as bcrypt from 'bcrypt';
import type { Queue } from 'bullmq';
import request from 'supertest';
import type { App } from 'supertest/types';

import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { QuickBooksSyncProcessor } from '../src/users/quickbooks/quickbooks-sync.processor';
import type { QuickBooksSyncJobPayload } from '../src/users/quickbooks/quickbooks-sync.service';
import { QUICKBOOKS_SYNC_QUEUE } from '../src/users/quickbooks/quickbooks.constants';

interface LoginResponseBody {
  accessToken?: string;
}

// Real e2e against Postgres + Redis, same convention as `job-scheduling.e2e-spec.ts`. Verifies
// the enqueue trigger and the sync logic as two separate real assertions rather than waiting on a
// live BullMQ worker to pick the job up — that proved flaky under a full 14-suite `--runInBand`
// run (many test apps sequentially opening/closing Workers on the same shared Redis instance).
// Neither half is mocked: `queue.getJobs()` reads the real Redis-backed queue, and the processor
// call runs its real logic against the real skeleton Postgres database.
describe('Users module — QuickBooks employee sync (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  // ADR-200 — `Role.id`/`User.id` are internal bigint, only used for this test's own direct Prisma
  // setup/teardown calls and for `QuickBooksSyncPointer.userId` (the model's own PK, no separate
  // publicId concept per ADR-200's documented exception list).
  let roleId: bigint;
  // Staff role's publicId — the wire shape `POST /users`'s `roleId` field actually expects
  // (resolved server-side via `resolveRoleId`, `users.service.ts`).
  let rolePublicId: string;
  let adminRoleId: bigint;
  let adminAccessToken: string;
  let staffAccessToken: string;
  // Admin user's internal bigint id — used for the `QuickBooksSyncPointer` lookup.
  let adminUserId: bigint;
  // Admin user's publicId — the wire shape `QuickBooksSyncJobPayload.userId` actually carries
  // (queue payloads are JSON-serialized, so ADR-200 keeps them on the external publicId contract).
  let adminUserPublicId: string;
  let createdUserIds: bigint[] = [];

  const staffUsername = 'e2e-qb-staff';
  const adminUsername = 'e2e-qb-admin';
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
    const role = await prisma.role.create({ data: { name: 'e2e-qb-role', depth: 0 } });
    roleId = role.id;
    rolePublicId = role.publicId;
    const adminRole = await prisma.role.create({ data: { name: 'Admin', depth: 0 } });
    adminRoleId = adminRole.id;

    const passwordHash = await bcrypt.hash(password, 10);
    const staffUser = await prisma.user.create({
      data: {
        firstName: 'E2E',
        lastName: 'QbStaff',
        username: staffUsername,
        email: 'e2e-qb-staff@skeleton.local',
        passwordHash,
        roleId,
        status: 'active',
      },
    });
    const adminUser = await prisma.user.create({
      data: {
        firstName: 'E2E',
        lastName: 'QbAdmin',
        username: adminUsername,
        email: 'e2e-qb-admin@skeleton.local',
        passwordHash,
        roleId: adminRoleId,
        status: 'active',
      },
    });
    adminUserId = adminUser.id;
    adminUserPublicId = adminUser.publicId;
    createdUserIds = [staffUser.id, adminUser.id];

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
    await prisma.quickBooksSyncPointer.deleteMany({ where: { userId: { in: createdUserIds } } });
    await prisma.user.deleteMany({ where: { id: { in: createdUserIds } } });
    await prisma.role.deleteMany({ where: { id: { in: [roleId, adminRoleId] } } });
    await app.close();
  });

  it('enqueues a real sync job on user create (FR-013 Main Flow trigger)', async () => {
    const queue = app.get<Queue<QuickBooksSyncJobPayload>>(getQueueToken(QUICKBOOKS_SYNC_QUEUE));

    const response = await request(app.getHttpServer())
      .post('/users')
      .set('X-Tenant-Subdomain', 'skeleton')
      .set('Authorization', `Bearer ${adminAccessToken}`)
      .send({
        firstName: 'New',
        lastName: 'Hire',
        username: 'e2e-qb-newhire',
        email: 'e2e-qb-newhire@skeleton.local',
        password: 'CorrectHorse1',
        roleId: rolePublicId,
      })
      .expect(201);
    const newUserPublicId = (response.body as { id: string }).id;
    const newUser = await prisma.user.findUniqueOrThrow({ where: { publicId: newUserPublicId } });
    createdUserIds.push(newUser.id);

    const jobs = await queue.getJobs(['waiting', 'active', 'completed', 'delayed']);
    const enqueued = jobs.find((job) => job.data.userId === newUserPublicId);
    expect(enqueued?.data).toEqual({ userId: newUserPublicId, tenantSubdomain: 'skeleton' });
  });

  it('processes a sync job and upserts a synced pointer (FR-013 sync logic)', async () => {
    const processor = app.get(QuickBooksSyncProcessor);

    await processor.process({
      data: { userId: adminUserPublicId, tenantSubdomain: 'skeleton' },
    } as never);

    const pointer = await prisma.quickBooksSyncPointer.findUnique({
      where: { userId: adminUserId },
    });
    expect(pointer?.status).toBe('synced');
    expect(pointer?.qbListId).toEqual(expect.any(String));
  });

  it('lets an Admin list per-user sync status', async () => {
    await request(app.getHttpServer())
      .get('/quickbooks-sync/status')
      .set('X-Tenant-Subdomain', 'skeleton')
      .set('Authorization', `Bearer ${adminAccessToken}`)
      .expect(200);
  });

  it('denies a non-Admin from reading sync status (403)', async () => {
    await request(app.getHttpServer())
      .get('/quickbooks-sync/status')
      .set('X-Tenant-Subdomain', 'skeleton')
      .set('Authorization', `Bearer ${staffAccessToken}`)
      .expect(403);
  });
});
