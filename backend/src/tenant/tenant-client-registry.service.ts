import { Injectable, NotFoundException, OnModuleDestroy } from '@nestjs/common';
import { PrismaPg } from '@prisma/adapter-pg';

import { PrismaClient } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';

const SKELETON_SUBDOMAIN = 'skeleton';

// Resolves a subdomain to a cached, connected `PrismaClient` (ADR-183). `skeleton` itself is
// already connected via `PrismaService` (T-022 pointed `DATABASE_URL` at the skeleton database) —
// every other subdomain is looked up in `TenantRegistry` (skeleton's own table) on cache miss,
// then its client is created once and reused for the process lifetime.
@Injectable()
export class TenantClientRegistryService implements OnModuleDestroy {
  private readonly clients = new Map<string, PrismaClient>();

  constructor(private readonly skeleton: PrismaService) {}

  async resolve(subdomain: string): Promise<PrismaClient> {
    if (subdomain === SKELETON_SUBDOMAIN) return this.skeleton;

    const cached = this.clients.get(subdomain);
    if (cached) return cached;

    const registryEntry = await this.skeleton.tenantRegistry.findUnique({ where: { subdomain } });
    if (!registryEntry) {
      throw new NotFoundException(`Unknown tenant subdomain: ${subdomain}`);
    }

    const adapter = new PrismaPg({ connectionString: registryEntry.databaseUrl });
    const client = new PrismaClient({ adapter });
    await client.$connect();

    this.clients.set(subdomain, client);
    return client;
  }

  async onModuleDestroy() {
    await Promise.all([...this.clients.values()].map((client) => client.$disconnect()));
  }
}
