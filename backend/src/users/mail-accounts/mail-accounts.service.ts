import { Injectable, NotFoundException } from '@nestjs/common';

import { TenantContextService } from '../../tenant/tenant-context.service';

import type { UpsertMailAccountDto } from './dto/upsert-mail-account.dto';

// Self-service Mail Account (`4-schema.md` §3 MailAccount, wired to T-043) — 1:1 with User, own
// record only. No REST contract exists in `8-api.md` for this entity (ADR-188 covers Notification
// Scheduler/Word Template only) — this task designs the minimal shape, matching the project's
// existing self-service `/users/me/*` convention.
@Injectable()
export class MailAccountsService {
  constructor(private readonly tenantContext: TenantContextService) {}

  private get prisma() {
    return this.tenantContext.prisma;
  }

  // `MailAccount`'s PK is the owning User's internal bigint `id` (shared-PK 1:1 extension table,
  // ADR-200 — no separate `public_id`: it's never addressed by its own URL/endpoint, only ever
  // read/written as part of "my own" record). `userId` is stripped from the response below since
  // it's an internal id (never exposed) and a raw `bigint` can't survive `JSON.stringify` anyway.
  async findOwn(userId: bigint) {
    const account = await this.prisma.mailAccount.findUnique({ where: { userId } });
    if (!account) throw new NotFoundException('No mail account configured yet.');
    const { userId: _internalUserId, ...rest } = account;
    return rest;
  }

  async upsertOwn(userId: bigint, dto: UpsertMailAccountDto) {
    const account = await this.prisma.mailAccount.upsert({
      where: { userId },
      create: { userId, ...dto },
      update: dto,
    });
    const { userId: _internalUserId, ...rest } = account;
    return rest;
  }
}
