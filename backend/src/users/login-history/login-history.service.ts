import { Injectable } from '@nestjs/common';

import { TenantContextService } from '../../tenant/tenant-context.service';

import type { LoginHistoryQueryDto } from './dto/login-history-query.dto';

// Append-only audit trail (`8-api.md` §2 GET /login-history, FR-011) — read-only, no
// create/edit/delete surface; rows are written by `AuthService` on every login attempt.
@Injectable()
export class LoginHistoryService {
  constructor(private readonly tenantContext: TenantContextService) {}

  private get prisma() {
    return this.tenantContext.prisma;
  }

  list(query: LoginHistoryQueryDto) {
    return this.prisma.loginHistory.findMany({
      where: {
        username: query.username,
        loginTime: {
          gte: query.from ? new Date(query.from) : undefined,
          lte: query.to ? new Date(query.to) : undefined,
        },
      },
      orderBy: { loginTime: 'desc' },
    });
  }
}
