import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { Client as PgClient } from 'pg';

import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { withDatabaseName } from '../src/tenant/pg-connection-string';
import { ProvisionTenantDto } from '../src/tenant/provisioning/provision-tenant.dto';
import { TenantProvisioningService } from '../src/tenant/provisioning/tenant-provisioning.service';

// Real end-to-end check against a real local Postgres — creates an actual second tenant database
// (T-024/T-028: "provision a real 2nd local tenant, not mocked"). No login flow exists yet
// (Users module is M3), so this calls the service directly instead of the guarded HTTP endpoint.
describe('TenantProvisioningService (e2e)', () => {
  let app: INestApplication;
  let provisioning: TenantProvisioningService;
  let skeleton: PrismaService;
  const subdomain = 'e2e-test-tenant';

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    provisioning = app.get(TenantProvisioningService);
    skeleton = app.get(PrismaService);
  });

  afterEach(async () => {
    await skeleton.tenantRegistry.deleteMany({ where: { subdomain } });

    // Derived the same way the service names it — cleans up even if a test failed before the
    // registry insert step (CREATE DATABASE alone leaves no registry row to look the name up from).
    const databaseName = `lbm_erp_tenant_${subdomain.replace(/-/g, '_')}`;
    const adminClient = new PgClient({
      connectionString: withDatabaseName(process.env.DATABASE_URL!, 'postgres'),
    });
    await adminClient.connect();
    await adminClient.query(
      `SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = $1`,
      [databaseName],
    );
    await adminClient.query(`DROP DATABASE IF EXISTS "${databaseName}"`);
    await adminClient.end();

    await app.close();
  });

  it('provisions a real tenant database with a bootstrap Super Admin', async () => {
    const dto = new ProvisionTenantDto();
    dto.subdomain = subdomain;
    dto.type = 'testing';
    dto.superAdminEmail = 'super-admin@e2e-test-tenant.local';
    dto.superAdminPassword = 'temporary-password-1';

    const result = await provisioning.provision(dto);
    expect(result.subdomain).toBe(subdomain);

    const registryEntry = await skeleton.tenantRegistry.findUnique({ where: { subdomain } });
    expect(registryEntry).not.toBeNull();
    expect(registryEntry?.type).toBe('testing');

    const tenantClient = new PgClient({ connectionString: registryEntry!.databaseUrl });
    await tenantClient.connect();
    const usersResult = await tenantClient.query<{ email: string; is_super_admin: boolean }>(
      'SELECT email, is_super_admin FROM users',
    );
    await tenantClient.end();

    expect(usersResult.rows).toHaveLength(1);
    expect(usersResult.rows[0].email).toBe(dto.superAdminEmail);
    expect(usersResult.rows[0].is_super_admin).toBe(true);
  }, 30000);

  it('rejects a duplicate subdomain', async () => {
    const dto = new ProvisionTenantDto();
    dto.subdomain = subdomain;
    dto.type = 'testing';
    dto.superAdminEmail = 'super-admin@e2e-test-tenant.local';
    dto.superAdminPassword = 'temporary-password-1';

    await provisioning.provision(dto);
    await expect(provisioning.provision(dto)).rejects.toThrow('already provisioned');
  }, 30000);

  it('lists provisioned tenants for the control panel (T-027)', async () => {
    const dto = new ProvisionTenantDto();
    dto.subdomain = subdomain;
    dto.type = 'testing';
    dto.superAdminEmail = 'super-admin@e2e-test-tenant.local';
    dto.superAdminPassword = 'temporary-password-1';
    await provisioning.provision(dto);

    const tenants = await provisioning.listTenants();
    expect(tenants.some((t) => t.subdomain === subdomain)).toBe(true);
  }, 30000);

  it('migration fanout applies to a real provisioned tenant (T-027)', async () => {
    const dto = new ProvisionTenantDto();
    dto.subdomain = subdomain;
    dto.type = 'testing';
    dto.superAdminEmail = 'super-admin@e2e-test-tenant.local';
    dto.superAdminPassword = 'temporary-password-1';
    await provisioning.provision(dto);

    const results = await provisioning.migrateFanout('testing');
    const ownResult = results.find((r) => r.subdomain === subdomain);
    expect(ownResult?.status).toBe('ok');
  }, 60000);
});
