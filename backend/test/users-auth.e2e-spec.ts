import { INestApplication, ValidationPipe } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import * as bcrypt from 'bcrypt';
import request from 'supertest';
import type { App } from 'supertest/types';

import { AppModule } from '../src/app.module';
import { AuthService } from '../src/auth/auth.service';
import { PrismaService } from '../src/prisma/prisma.service';

interface LoginResponseBody {
  accessToken?: string;
  refreshToken?: string;
  message?: string;
  requires2fa?: boolean;
  challengeToken?: string;
}

// Real end-to-end check against the real skeleton Postgres database (same convention as
// `tenant-provisioning.e2e-spec.ts`/`job-scheduling.e2e-spec.ts`) — exercises the actual HTTP
// layer (ValidationPipe, JwtAuthGuard, RolesGuard, TenantResolutionMiddleware) rather than
// calling services directly, since T-048's acceptance criteria are about the real request path.
describe('Users module — auth (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let roleId: string;
  let userId: string;
  const username = 'e2e-login-user';
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
    const role = await prisma.role.create({ data: { name: 'e2e-Admin', depth: 0 } });
    roleId = role.id;
    const passwordHash = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: {
        firstName: 'E2E',
        lastName: 'Login',
        username,
        email: 'e2e-login-user@skeleton.local',
        passwordHash,
        roleId,
        status: 'active',
      },
    });
    userId = user.id;
  });

  afterEach(async () => {
    await prisma.user.deleteMany({ where: { id: userId } });
    await prisma.role.deleteMany({ where: { id: roleId } });
    await app.close();
  });

  it('logs in with correct username/password and issues a JWT pair', async () => {
    const response = await request(app.getHttpServer())
      .post('/auth/login')
      .set('X-Tenant-Subdomain', 'skeleton')
      .send({ username, password })
      .expect(201);

    expect((response.body as LoginResponseBody).accessToken).toEqual(expect.any(String));
    expect((response.body as LoginResponseBody).refreshToken).toEqual(expect.any(String));
  });

  it('rejects an incorrect password with a generic message', async () => {
    const response = await request(app.getHttpServer())
      .post('/auth/login')
      .set('X-Tenant-Subdomain', 'skeleton')
      .send({ username, password: 'wrong-password' })
      .expect(401);

    expect((response.body as LoginResponseBody).message).toBe('Invalid username or password.');
  });

  it('locks the account after 5 failed attempts (ADR-155)', async () => {
    for (let attempt = 0; attempt < 5; attempt += 1) {
      await request(app.getHttpServer())
        .post('/auth/login')
        .set('X-Tenant-Subdomain', 'skeleton')
        .send({ username, password: 'wrong-password' })
        .expect(401);
    }

    // 6th attempt, even with the CORRECT password, is rejected because the account is now locked.
    const response = await request(app.getHttpServer())
      .post('/auth/login')
      .set('X-Tenant-Subdomain', 'skeleton')
      .send({ username, password })
      .expect(401);
    expect((response.body as LoginResponseBody).message).toBe('Account locked. Try again later.');

    const locked = await prisma.user.findUnique({ where: { id: userId } });
    expect(locked?.lockedUntil).not.toBeNull();
  }, 15000);

  it('never authenticates an Inactive user, even with correct credentials (USR-RULE-022)', async () => {
    await prisma.user.update({ where: { id: userId }, data: { status: 'inactive' } });

    const response = await request(app.getHttpServer())
      .post('/auth/login')
      .set('X-Tenant-Subdomain', 'skeleton')
      .send({ username, password })
      .expect(401);
    expect((response.body as LoginResponseBody).message).toBe('Invalid username or password.');
  });

  it('rejects an unauthenticated request to a protected route', async () => {
    await request(app.getHttpServer())
      .get('/users')
      .set('X-Tenant-Subdomain', 'skeleton')
      .expect(401);
  });

  it('allows a logged-in Admin to list users, and denies a non-Admin role', async () => {
    const login = await request(app.getHttpServer())
      .post('/auth/login')
      .set('X-Tenant-Subdomain', 'skeleton')
      .send({ username, password })
      .expect(201);

    // This test's seeded role is literally named "e2e-Admin", not "Admin" — proves RolesGuard
    // checks the JWT's actual role claim, not just "any role at all".
    await request(app.getHttpServer())
      .get('/users')
      .set('X-Tenant-Subdomain', 'skeleton')
      .set('Authorization', `Bearer ${(login.body as LoginResponseBody).accessToken}`)
      .expect(403);
  });
});

// Security-review fix verification: 2FA is bound to a signed per-login challenge token, not a
// raw userId (was: any caller could submit `{ userId, code }` and brute-force the 6-digit code
// against a known/enumerated user; now: the token itself proves the caller actually completed
// this specific login attempt, and codes are generated with `crypto.randomInt`, not `Math.random`).
describe('Users module — 2FA (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let auth: AuthService;
  let roleId: string;
  let userId: string;
  const username = 'e2e-2fa-user';
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
    auth = app.get(AuthService);
    const role = await prisma.role.create({ data: { name: 'e2e-2fa-role', depth: 0 } });
    roleId = role.id;
    await prisma.roleTwoFactorRequirement.create({ data: { roleId, required: true } });
    const passwordHash = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: {
        firstName: 'E2E',
        lastName: 'TwoFactor',
        username,
        email: 'e2e-2fa-user@skeleton.local',
        passwordHash,
        roleId,
        status: 'active',
      },
    });
    userId = user.id;
  });

  afterEach(async () => {
    await prisma.roleTwoFactorRequirement.deleteMany({ where: { roleId } });
    await prisma.user.deleteMany({ where: { id: userId } });
    await prisma.role.deleteMany({ where: { id: roleId } });
    await app.close();
  });

  function pendingCodeFor(id: string): string {
    // Reaching into the service's private in-memory store — the code is only ever logged to
    // stdout in this dev-only slice (no real email delivery yet), so this is the only way a
    // test can observe it. See `AuthService`'s own "Known limitation" comment.
    const pending = (auth as unknown as { pendingTwoFactor: Map<string, { code: string }> })
      .pendingTwoFactor;
    const entry = pending.get(id);
    if (!entry) throw new Error('No pending 2FA code found for user.');
    return entry.code;
  }

  it('login for a 2FA-required role returns a challenge token, not tokens directly', async () => {
    const response = await request(app.getHttpServer())
      .post('/auth/login')
      .set('X-Tenant-Subdomain', 'skeleton')
      .send({ username, password })
      .expect(201);

    const body = response.body as LoginResponseBody;
    expect(body.requires2fa).toBe(true);
    expect(body.challengeToken).toEqual(expect.any(String));
    expect(body.accessToken).toBeUndefined();
  });

  it('completes login with the correct code and challenge token', async () => {
    const login = await request(app.getHttpServer())
      .post('/auth/login')
      .set('X-Tenant-Subdomain', 'skeleton')
      .send({ username, password })
      .expect(201);
    const { challengeToken } = login.body as LoginResponseBody;
    const code = pendingCodeFor(userId);

    const verify = await request(app.getHttpServer())
      .post('/auth/2fa/verify')
      .set('X-Tenant-Subdomain', 'skeleton')
      .send({ challengeToken, code })
      .expect(201);

    expect((verify.body as LoginResponseBody).accessToken).toEqual(expect.any(String));
  });

  it('rejects a well-formed but wrong-purpose JWT as a challenge token (session-binding fix)', async () => {
    // A normal access token (right signature, but `purpose !== '2fa-challenge'`) must not work
    // as a 2FA challenge — exactly the class of bug the security review flagged: verification
    // must be bound to a real, purpose-specific challenge, not just "any signed token".
    const jwt = app.get(JwtService);
    const normalAccessToken = jwt.sign({ sub: userId, tenant: 'skeleton', role: 'e2e-2fa-role' });

    await request(app.getHttpServer())
      .post('/auth/2fa/verify')
      .set('X-Tenant-Subdomain', 'skeleton')
      .send({ challengeToken: normalAccessToken, code: '000000' })
      .expect(401);
  });

  it('rejects the wrong code and locks out after 5 wrong attempts', async () => {
    const login = await request(app.getHttpServer())
      .post('/auth/login')
      .set('X-Tenant-Subdomain', 'skeleton')
      .send({ username, password })
      .expect(201);
    const { challengeToken } = login.body as LoginResponseBody;

    for (let attempt = 0; attempt < 5; attempt += 1) {
      await request(app.getHttpServer())
        .post('/auth/2fa/verify')
        .set('X-Tenant-Subdomain', 'skeleton')
        .send({ challengeToken, code: '000000' })
        .expect(401);
    }

    // Even the real code no longer works — the pending challenge was discarded after
    // TWO_FACTOR_MAX_VERIFY_ATTEMPTS wrong guesses (max-attempts fix, security review finding).
    const realCode = (() => {
      try {
        return pendingCodeFor(userId);
      } catch {
        return null;
      }
    })();
    expect(realCode).toBeNull();
  }, 15000);
});
