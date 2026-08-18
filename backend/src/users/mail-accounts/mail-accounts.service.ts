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

  async findOwn(userId: string) {
    const account = await this.prisma.mailAccount.findUnique({ where: { userId } });
    if (!account) throw new NotFoundException('No mail account configured yet.');
    return account;
  }

  upsertOwn(userId: string, dto: UpsertMailAccountDto) {
    return this.prisma.mailAccount.upsert({
      where: { userId },
      create: { userId, ...dto },
      update: dto,
    });
  }
}
