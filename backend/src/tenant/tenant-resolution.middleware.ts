import { Injectable, NestMiddleware } from '@nestjs/common';
import type { NextFunction, Request, Response } from 'express';

import { TenantClientRegistryService } from './tenant-client-registry.service';
import { tenantContextStorage } from './tenant-context';

const SKELETON_SUBDOMAIN = 'skeleton';
const IPV4_PATTERN = /^\d+\.\d+\.\d+\.\d+$/;

// Extracts the tenant subdomain from the Host header (`wbc.omnna-lbm.live` -> `wbc`, ADR-056). A
// bare host with no subdomain label (`localhost`, an IPv4/IPv6 address, or a single-label domain)
// has no tenant to resolve and falls back to skeleton. `X-Tenant-Subdomain` overrides both, for
// local testing without wildcard DNS/hosts-file setup — non-production only. Trusting this header
// unconditionally would let any caller pick any tenant's database, defeating ADR-056's physical
// isolation; production has no legitimate reason to override Host-based resolution.
export function extractSubdomain(req: Pick<Request, 'headers' | 'hostname'>): string {
  if (process.env.NODE_ENV !== 'production') {
    const override = req.headers['x-tenant-subdomain'];
    if (typeof override === 'string' && override.length > 0) return override;
  }

  const { hostname } = req;
  if (hostname === 'localhost' || IPV4_PATTERN.test(hostname) || hostname.includes(':')) {
    return SKELETON_SUBDOMAIN;
  }

  const labels = hostname.split('.');
  return labels.length > 1 ? labels[0] : SKELETON_SUBDOMAIN;
}

@Injectable()
export class TenantResolutionMiddleware implements NestMiddleware {
  constructor(private readonly tenantClients: TenantClientRegistryService) {}

  async use(req: Request, res: Response, next: NextFunction) {
    const subdomain = extractSubdomain(req);
    const prisma = await this.tenantClients.resolve(subdomain);

    tenantContextStorage.run({ subdomain, prisma }, () => next());
  }
}
