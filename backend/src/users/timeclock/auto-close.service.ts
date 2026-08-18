import { Injectable, Logger } from '@nestjs/common';

import type { PrismaClient } from '../../generated/prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { TenantClientRegistryService } from '../../tenant/tenant-client-registry.service';

// Auto-clock-out safety net (`3-business-rules.md` §7 Background Processing, ADR-037). Never
// guesses a clock-out time — a punch still open once its `punch_date` is in the past is flipped
// to `unclosed_needs_resolution`, an explicit, visible state requiring manager action, matching
// the schema's own "never silently excluded from payroll" design (`4-schema.md` §4
// `time_clock_records`). Runs across every registered tenant — this sweep has no HTTP request to
// derive tenant context from, so it resolves each tenant's own client via
// `TenantClientRegistryService` rather than `TenantContextService` (see that service's own doc
// comment on background-job usage).
@Injectable()
export class TimeclockAutoCloseService {
  private readonly logger = new Logger(TimeclockAutoCloseService.name);

  constructor(
    private readonly skeleton: PrismaService,
    private readonly registry: TenantClientRegistryService,
  ) {}

  async sweepTenant(prisma: PrismaClient): Promise<number> {
    const todayStart = new Date(
      Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth(), new Date().getUTCDate()),
    );

    const result = await prisma.timeClockRecord.updateMany({
      where: { status: 'clock_in', punchDate: { lt: todayStart } },
      data: { status: 'unclosed_needs_resolution' },
    });
    return result.count;
  }

  async sweepAllTenants(): Promise<void> {
    const tenants = await this.skeleton.tenantRegistry.findMany({ select: { subdomain: true } });
    const subdomains = ['skeleton', ...tenants.map((tenant) => tenant.subdomain)];

    for (const subdomain of subdomains) {
      const client = await this.registry.resolve(subdomain);
      const flagged = await this.sweepTenant(client);
      if (flagged > 0) {
        this.logger.log(`Flagged ${flagged} unclosed punch(es) for tenant "${subdomain}".`);
      }
    }
  }
}
