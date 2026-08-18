import { Injectable, InternalServerErrorException } from '@nestjs/common';

import type { PrismaClient } from '../generated/prisma/client';

import { tenantContextStorage } from './tenant-context';

// Downstream services read the current request's tenant via this, instead of injecting a global
// `PrismaService` directly (ADR-183). Throws outside a request context (e.g. called from a
// background job) — callers needing tenant data outside a request resolve their own client via
// `TenantClientRegistryService` instead.
@Injectable()
export class TenantContextService {
  get subdomain(): string {
    return this.store.subdomain;
  }

  get prisma(): PrismaClient {
    return this.store.prisma;
  }

  private get store() {
    const store = tenantContextStorage.getStore();
    if (!store) {
      throw new InternalServerErrorException(
        'No tenant context — TenantContextService used outside a request (e.g. from a background job).',
      );
    }
    return store;
  }
}
