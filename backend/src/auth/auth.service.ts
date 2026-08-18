import { randomInt } from 'crypto';

import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';

import { TenantContextService } from '../tenant/tenant-context.service';

const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_MINUTES = 15;
const TWO_FACTOR_CODE_TTL_MS = 15 * 60 * 1000;
const TWO_FACTOR_MAX_VERIFY_ATTEMPTS = 5;

interface PendingTwoFactor {
  code: string;
  expiresAt: number;
  attempts: number;
}

interface TwoFactorChallengePayload {
  sub: string;
  purpose: '2fa-challenge';
}

// Login/2FA/password-change (`docs-kit/5-modules/users/8-api.md` §3, FR-001/FR-007). DB-backed
// lockout (ADR-155: 5 attempts -> 15-min lockout, survives session loss, closes USR-RISK-006) —
// tracked on `users.failed_login_count`/`locked_until`, not session-scoped state.
//
// **Known limitation, flagged not hidden**: 2FA codes are held in an in-memory Map, not Redis —
// this project's own standing async-job convention (ADR-031) and email delivery are both out of
// scope for this backend slice. A restart loses in-flight codes; fine for local dev, not
// production-ready. Revisit alongside T-063's own "first real implementation of a shared
// mechanism" pattern once Redis wiring for this module is prioritized.
@Injectable()
export class AuthService {
  private readonly pendingTwoFactor = new Map<string, PendingTwoFactor>();

  constructor(
    private readonly jwt: JwtService,
    private readonly tenantContext: TenantContextService,
  ) {}

  private get prisma() {
    return this.tenantContext.prisma;
  }

  async login(username: string, password: string) {
    // Generic error for every failure mode — deliberate anti-enumeration posture
    // (USR-RULE-030), never distinguishes "wrong password" from "unknown user".
    const genericError = () => new UnauthorizedException('Invalid username or password.');

    const user = await this.prisma.user.findFirst({ where: { username, isDeleted: false } });
    if (!user) throw genericError();

    if (user.lockedUntil && user.lockedUntil.getTime() > Date.now()) {
      throw new UnauthorizedException('Account locked. Try again later.');
    }

    if (user.status === 'inactive') {
      // Preserves USR-RULE-022's real, enforced gate — Inactive accounts never authenticate
      // regardless of correct credentials.
      throw genericError();
    }

    const passwordMatches = await bcrypt.compare(password, user.passwordHash);
    if (!passwordMatches) {
      const failedLoginCount = user.failedLoginCount + 1;
      const lockedUntil =
        failedLoginCount >= MAX_FAILED_ATTEMPTS
          ? new Date(Date.now() + LOCKOUT_MINUTES * 60 * 1000)
          : null;
      await this.prisma.user.update({
        where: { id: user.id },
        data: { failedLoginCount, lockedUntil },
      });
      throw genericError();
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: { failedLoginCount: 0, lockedUntil: null },
    });
    await this.recordLoginHistory(username, 'success');

    const requiresTwoFactor = user.roleId
      ? Boolean(
          (
            await this.prisma.roleTwoFactorRequirement.findUnique({
              where: { roleId: user.roleId },
            })
          )?.required,
        )
      : false;

    if (requiresTwoFactor) {
      const code = String(randomInt(0, 1_000_000)).padStart(6, '0');
      this.pendingTwoFactor.set(user.id, {
        code,
        expiresAt: Date.now() + TWO_FACTOR_CODE_TTL_MS,
        attempts: 0,
      });
      // Sent only to the account holder's own email — no CC/broadcast path (ADR-076). Actual
      // email delivery is out of scope for this backend slice (no SMTP/BullMQ wiring here yet);
      // logged instead so local dev can complete the flow without a real mail provider.

      console.log(`[2FA] Verification code for ${user.email}: ${code}`);

      // Short-lived signed challenge token, not the raw userId — binds `/auth/2fa/verify` to
      // *this* login attempt rather than letting any caller submit an arbitrary userId + guessed
      // code (session-binding fix, security review finding).
      const challengeToken = this.jwt.sign(
        { sub: user.id, purpose: '2fa-challenge' } satisfies TwoFactorChallengePayload,
        { expiresIn: '15m' },
      );
      return { requires2fa: true, challengeToken };
    }

    return this.issueTokens(user.id, user.roleId);
  }

  async verifyTwoFactor(challengeToken: string, code: string) {
    const invalidChallenge = () => new UnauthorizedException('Incorrect or expired code.');

    let payload: TwoFactorChallengePayload;
    try {
      payload = this.jwt.verify<TwoFactorChallengePayload>(challengeToken);
    } catch {
      throw invalidChallenge();
    }
    if (payload.purpose !== '2fa-challenge') throw invalidChallenge();

    const userId = payload.sub;
    const pending = this.pendingTwoFactor.get(userId);
    if (!pending || pending.expiresAt < Date.now()) {
      this.pendingTwoFactor.delete(userId);
      throw invalidChallenge();
    }

    if (pending.code !== code) {
      pending.attempts += 1;
      if (pending.attempts >= TWO_FACTOR_MAX_VERIFY_ATTEMPTS) {
        this.pendingTwoFactor.delete(userId);
      }
      throw invalidChallenge();
    }

    this.pendingTwoFactor.delete(userId);

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw invalidChallenge();
    return this.issueTokens(user.id, user.roleId);
  }

  private async issueTokens(userId: string, roleId: string | null) {
    const role = roleId ? await this.prisma.role.findUnique({ where: { id: roleId } }) : null;
    const payload = { sub: userId, tenant: this.tenantContext.subdomain, role: role?.name ?? '' };
    return {
      accessToken: this.jwt.sign(payload, { expiresIn: '15m' }),
      refreshToken: this.jwt.sign(payload, { expiresIn: '7d' }),
    };
  }

  private async recordLoginHistory(username: string, status: string) {
    await this.prisma.loginHistory.create({ data: { username, status } });
  }
}
