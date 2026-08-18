import { AsyncLocalStorage } from 'node:async_hooks';

import type { PrismaClient } from '../generated/prisma/client';

// Request-scoped tenant context (ADR-183) — set by `TenantResolutionMiddleware`, read by
// `TenantContextService`. A plain AsyncLocalStorage rather than a NestJS request-scoped provider:
// avoids per-request DI instantiation overhead for something read on every data-access call.
export interface TenantContext {
  subdomain: string;
  prisma: PrismaClient;
}

export const tenantContextStorage = new AsyncLocalStorage<TenantContext>();
