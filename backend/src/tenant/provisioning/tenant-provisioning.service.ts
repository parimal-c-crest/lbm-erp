import { ConflictException, Injectable } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { Client as PgClient } from 'pg';

import type { TenantType } from '../../generated/prisma/enums';
import { PrismaService } from '../../prisma/prisma.service';
import { runMigrationFanout } from '../migrate-fanout';
import { getDatabaseName, withDatabaseName } from '../pg-connection-string';
import { runMigrateDeploy } from '../run-migrate-deploy';
import { TenantClientRegistryService } from '../tenant-client-registry.service';

import type { ProvisionTenantDto } from './provision-tenant.dto';

const BCRYPT_COST_FACTOR = 12;
const RESERVED_SUBDOMAINS = ['skeleton'];
// Validated again here, not just at the DTO layer — this value is interpolated into a DDL
// statement (`CREATE DATABASE`, which doesn't support parameterized identifiers), so trusting
// DTO validation alone would leave a defense-in-depth gap if this service is ever called from
// somewhere that skips the DTO (e.g. a future internal script).
const SAFE_IDENTIFIER = /^[a-z][a-z0-9-]{1,30}$/;

@Injectable()
export class TenantProvisioningService {
  constructor(
    private readonly skeleton: PrismaService,
    private readonly tenantClients: TenantClientRegistryService,
  ) {}

  async provision(dto: ProvisionTenantDto) {
    if (!SAFE_IDENTIFIER.test(dto.subdomain) || RESERVED_SUBDOMAINS.includes(dto.subdomain)) {
      throw new ConflictException(`Invalid or reserved subdomain: ${dto.subdomain}`);
    }

    const existing = await this.skeleton.tenantRegistry.findUnique({
      where: { subdomain: dto.subdomain },
    });
    if (existing) {
      throw new ConflictException(`Subdomain already provisioned: ${dto.subdomain}`);
    }

    const databaseName = `lbm_erp_tenant_${dto.subdomain.replace(/-/g, '_')}`;
    const skeletonUrl = process.env.DATABASE_URL;
    if (!skeletonUrl) throw new Error('DATABASE_URL is not set');

    const tenantDatabaseUrl = withDatabaseName(skeletonUrl, databaseName);

    // `CREATE DATABASE` can't run through Prisma's query builder or inside a transaction — a
    // fresh admin connection to the `postgres` maintenance database, not skeleton itself (per
    // ADR-056's note that a source database with active connections — which skeleton always has,
    // via `PrismaService`'s own pool — can't be used as a `CREATE DATABASE ... TEMPLATE` source;
    // this creates an empty database instead and applies schema via migration, §5/§6 of the
    // design doc).
    const adminClient = new PgClient({
      connectionString: withDatabaseName(skeletonUrl, 'postgres'),
    });
    await adminClient.connect();
    try {
      await adminClient.query(`CREATE DATABASE "${databaseName}"`);
    } finally {
      await adminClient.end();
    }

    await runMigrateDeploy(tenantDatabaseUrl);

    await this.skeleton.tenantRegistry.create({
      data: {
        subdomain: dto.subdomain,
        databaseUrl: tenantDatabaseUrl,
        type: dto.type,
        runtimeMode: dto.type === 'live' ? 'live' : 'sandbox',
      },
    });

    const tenantPrisma = await this.tenantClients.resolve(dto.subdomain);
    const passwordHash = await bcrypt.hash(dto.superAdminPassword, BCRYPT_COST_FACTOR);
    const superAdmin = await tenantPrisma.user.create({
      data: {
        email: dto.superAdminEmail,
        username: dto.superAdminEmail.split('@')[0],
        firstName: 'Super',
        lastName: 'Admin',
        passwordHash,
        // No `roleId` — Super Admin is a structurally separate axis from the Role catalog
        // (ADR-057), never assigned to the tenant-facing Role hierarchy.
        isSuperAdmin: true,
      },
    });
    // Self-referential audit columns (ADR-005/185) — the bootstrap row is its own creator.
    await tenantPrisma.user.update({
      where: { id: superAdmin.id },
      data: { createdBy: superAdmin.id, updatedBy: superAdmin.id },
    });

    return {
      subdomain: dto.subdomain,
      databaseName: getDatabaseName(tenantDatabaseUrl),
      superAdminEmail: dto.superAdminEmail,
    };
  }

  listTenants() {
    // `databaseUrl` carries Postgres credentials in plaintext — excluded even though this
    // endpoint is already Super Admin-only, since the control panel UI never needs it.
    return this.skeleton.tenantRegistry.findMany({
      orderBy: { createdAt: 'desc' },
      select: { id: true, subdomain: true, type: true, runtimeMode: true, createdAt: true },
    });
  }

  migrateFanout(typeFilter?: TenantType) {
    const skeletonUrl = process.env.DATABASE_URL;
    if (!skeletonUrl) throw new Error('DATABASE_URL is not set');
    return runMigrationFanout(this.skeleton, skeletonUrl, typeFilter);
  }
}
