import { CanActivate, ForbiddenException, Injectable } from '@nestjs/common';

import { TenantContextService } from './tenant-context.service';

// Every skeleton-control-panel endpoint (provisioning T-024, migration fanout T-025, cron mgmt
// T-026, control panel UI's own API calls T-027) is skeleton-subdomain-only (ADR-056/059) — no
// tenant-level Super Admin can reach these, only skeleton's own. Reused across all of them rather
// than repeating the same inline check.
@Injectable()
export class SkeletonOnlyGuard implements CanActivate {
  constructor(private readonly tenantContext: TenantContextService) {}

  canActivate(): boolean {
    if (this.tenantContext.subdomain !== 'skeleton') {
      throw new ForbiddenException('This endpoint is only available on the skeleton subdomain');
    }
    return true;
  }
}
