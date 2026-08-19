import { Injectable } from '@nestjs/common';

import { TenantContextService } from '../../tenant/tenant-context.service';

export interface ModuleActionPermission {
  module: string;
  action: string;
  granted: boolean;
}

// Role -> Profile -> module/action permission resolution (`2-functional-specification.md` §10).
// Resolved fresh from live tables on every call — no unconditional full-cache regeneration
// (closes the legacy system's per-save cache-rebuild cost, USR-RULE-012) and no staleness window
// (closes USR-RISK-015): a role/profile change takes effect on the very next request because
// there is no cache to invalidate in the first place.
@Injectable()
export class PermissionsService {
  constructor(private readonly tenantContext: TenantContextService) {}

  // `userId` is the User's internal bigint `id` (ADR-200) — callers are expected to pass
  // `request.user.internalId`, already resolved once per request by `JwtStrategy`, not the raw
  // JWT `sub` (`public_id`).
  async resolveForUser(userId: bigint): Promise<ModuleActionPermission[]> {
    const prisma = this.tenantContext.prisma;
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { roleId: true, isSuperAdmin: true },
    });
    if (!user) return [];

    // Super Admin bypasses every module/field/action permission check by design — a structurally
    // separate axis from the Role/Profile catalog, never assigned to a tenant's own business
    // users (ADR-057). Real modules aren't known yet in this codebase (only Users exists), so
    // this returns an empty grant list here — callers treat `isSuperAdmin` as an unconditional
    // bypass upstream (`hasPermission` below), not by enumerating every possible grant.
    if (user.isSuperAdmin || !user.roleId) return [];

    const grants = await prisma.profileModuleActionPermission.findMany({
      where: { profile: { roleProfiles: { some: { roleId: user.roleId } } }, granted: true },
      select: { module: true, action: true, granted: true },
    });
    return grants;
  }

  async hasPermission(userId: bigint, module: string, action: string): Promise<boolean> {
    const prisma = this.tenantContext.prisma;
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { isSuperAdmin: true },
    });
    if (user?.isSuperAdmin) return true;

    const grants = await this.resolveForUser(userId);
    return grants.some((grant) => grant.module === module && grant.action === action);
  }
}
