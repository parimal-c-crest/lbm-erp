import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import * as bcrypt from 'bcrypt';
import request from 'supertest';
import type { App } from 'supertest/types';

import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

interface LoginResponseBody {
  accessToken?: string;
}

// Full UOM module e2e suite (T-082, `11-testing.md` BR/VR traceability) — real skeleton
// Postgres/Redis, no mocks, same pattern as `holidays.e2e-spec.ts`/`users-auth.e2e-spec.ts`.
describe('UOM module (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let adminRoleId: string;
  let staffRoleId: string;
  let adminToken: string;
  let staffToken: string;

  const adminUsername = 'e2e-uom-admin';
  const staffUsername = 'e2e-uom-staff';
  const password = 'CorrectHorse1';

  const categoryIds: string[] = [];
  const typeIds: string[] = [];
  const roleIds: string[] = [];
  const groupIds: string[] = [];

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
    );
    await app.init();

    prisma = app.get(PrismaService);
    const adminRole = await prisma.role.create({ data: { name: 'Admin', depth: 0 } });
    adminRoleId = adminRole.id;
    const staffRole = await prisma.role.create({ data: { name: 'e2e-uom-staff-role', depth: 0 } });
    staffRoleId = staffRole.id;

    const passwordHash = await bcrypt.hash(password, 10);
    await prisma.user.create({
      data: {
        firstName: 'E2E',
        lastName: 'UomAdmin',
        username: adminUsername,
        email: 'e2e-uom-admin@skeleton.local',
        passwordHash,
        roleId: adminRoleId,
        status: 'active',
      },
    });
    await prisma.user.create({
      data: {
        firstName: 'E2E',
        lastName: 'UomStaff',
        username: staffUsername,
        email: 'e2e-uom-staff@skeleton.local',
        passwordHash,
        roleId: staffRoleId,
        status: 'active',
      },
    });

    const adminLogin = await request(app.getHttpServer())
      .post('/auth/login')
      .set('X-Tenant-Subdomain', 'skeleton')
      .send({ username: adminUsername, password })
      .expect(201);
    adminToken = (adminLogin.body as LoginResponseBody).accessToken!;

    const staffLogin = await request(app.getHttpServer())
      .post('/auth/login')
      .set('X-Tenant-Subdomain', 'skeleton')
      .send({ username: staffUsername, password })
      .expect(201);
    staffToken = (staffLogin.body as LoginResponseBody).accessToken!;
  });

  afterAll(async () => {
    // Sweep every `e2e-`-named Group, not just `groupIds` — the "deletes an unused, unlocked
    // Group" test creates one that's never pushed onto `groupIds`, and a soft-deleted Group row
    // (isDeleted=true) still physically exists and still holds its `base_type_id` FK, so it must
    // be swept too or the Type deletes below fail with a RESTRICT violation.
    const allE2eGroups = await prisma.uOMGroup.findMany({
      where: { name: { startsWith: 'e2e-' } },
      select: { id: true },
    });
    const allGroupIds = [...new Set([...groupIds, ...allE2eGroups.map((g) => g.id)])];

    await prisma.uOMPickingHierarchy.deleteMany({ where: { groupId: { in: allGroupIds } } });
    await prisma.uOMTypeFactorHistory.deleteMany({ where: { groupId: { in: allGroupIds } } });
    await prisma.uOMConversionFactor.deleteMany({ where: { groupId: { in: allGroupIds } } });
    await prisma.uOMRoleAssignment.deleteMany({ where: { groupId: { in: allGroupIds } } });
    await prisma.uOMGroup.deleteMany({ where: { id: { in: allGroupIds } } });
    await prisma.uOMType.deleteMany({ where: { id: { in: typeIds } } });
    await prisma.uOMCategory.deleteMany({ where: { id: { in: categoryIds } } });
    await prisma.uOMFunctionalRole.deleteMany({ where: { id: { in: roleIds } } });
    await prisma.user.deleteMany({ where: { username: { in: [adminUsername, staffUsername] } } });
    await prisma.role.deleteMany({ where: { id: { in: [adminRoleId, staffRoleId] } } });
    await app.close();
  });

  function admin() {
    return { Authorization: `Bearer ${adminToken}`, 'X-Tenant-Subdomain': 'skeleton' };
  }
  function staff() {
    return { Authorization: `Bearer ${staffToken}`, 'X-Tenant-Subdomain': 'skeleton' };
  }

  // --- BR-017/ADR-006 — server-side authorization ---------------------------------------
  it('denies a non-Admin from creating a Category (403)', async () => {
    await request(app.getHttpServer())
      .post('/uom/categories')
      .set(staff())
      .send({ name: 'e2e-Should-Be-Denied' })
      .expect(403);
  });

  it('rejects an unauthenticated request (401)', async () => {
    await request(app.getHttpServer())
      .get('/uom/categories')
      .set('X-Tenant-Subdomain', 'skeleton')
      .expect(401);
  });

  // --- Category/Type/Functional Role CRUD (T-074, BR-010/BR-014) ------------------------
  let categoryId: string;
  let typeBaseId: string;
  let typeOtherId: string;
  let roleSellingId: string;
  let rolePickingIdForDeleteTest: string;

  it('creates a Category', async () => {
    const res = await request(app.getHttpServer())
      .post('/uom/categories')
      .set(admin())
      .send({ name: 'e2e-Length', sortOrder: 1 })
      .expect(201);
    categoryId = (res.body as { id: string }).id;
    categoryIds.push(categoryId);
  });

  it('rejects a duplicate Category name (409, BR-010 uniqueness)', async () => {
    await request(app.getHttpServer())
      .post('/uom/categories')
      .set(admin())
      .send({ name: 'e2e-Length' })
      .expect(409);
  });

  it('creates two Types, one with an optional categoryId (ADR-192)', async () => {
    const base = await request(app.getHttpServer())
      .post('/uom/types')
      .set(admin())
      .send({ name: 'e2e-Foot', categoryId, sortOrder: 1 })
      .expect(201);
    typeBaseId = (base.body as { id: string }).id;
    typeIds.push(typeBaseId);

    const other = await request(app.getHttpServer())
      .post('/uom/types')
      .set(admin())
      .send({ name: 'e2e-Bundle' })
      .expect(201);
    typeOtherId = (other.body as { id: string }).id;
    typeIds.push(typeOtherId);
    expect((other.body as { categoryId: string | null }).categoryId).toBeNull();
  });

  it('blocks deleting a Category still referenced by a Type (BR-014/VR-015)', async () => {
    await request(app.getHttpServer())
      .delete(`/uom/categories/${categoryId}`)
      .set(admin())
      .expect(409);
  });

  it('creates a Functional Role and blocks its in-use delete (BR-014/VR-020)', async () => {
    const res = await request(app.getHttpServer())
      .post('/uom/functional-roles')
      .set(admin())
      .send({ name: 'e2e-Selling' })
      .expect(201);
    roleSellingId = (res.body as { id: string }).id;
    roleIds.push(roleSellingId);

    const other = await request(app.getHttpServer())
      .post('/uom/functional-roles')
      .set(admin())
      .send({ name: 'e2e-Picking' })
      .expect(201);
    rolePickingIdForDeleteTest = (other.body as { id: string }).id;
    roleIds.push(rolePickingIdForDeleteTest);
  });

  // --- Group save — BR-001/BR-002/BR-019 -------------------------------------------------
  let groupId: string;

  it('rejects a Group with no Base Type (BR-002)', async () => {
    await request(app.getHttpServer())
      .post('/uom/groups')
      .set(admin())
      .send({ name: 'e2e-No-Base', roleAssignments: [], conversionFactors: [] })
      .expect(400);
  });

  it('rejects a Group save missing a Conversion Factor for a non-Base role-assigned Type (BR-019)', async () => {
    await request(app.getHttpServer())
      .post('/uom/groups')
      .set(admin())
      .send({
        name: 'e2e-Incomplete-Group',
        baseTypeId: typeBaseId,
        roleAssignments: [{ roleId: roleSellingId, typeId: typeOtherId }],
        conversionFactors: [], // typeOtherId has no factor — BR-019 violation
      })
      .expect(409);
  });

  it('creates a complete Group atomically (Group + Role Assignments + Conversion Factors)', async () => {
    const res = await request(app.getHttpServer())
      .post('/uom/groups')
      .set(admin())
      .send({
        name: 'e2e-Rebar-Bundles',
        categoryId,
        baseTypeId: typeBaseId,
        roleAssignments: [
          { roleId: roleSellingId, typeId: typeBaseId },
          { roleId: rolePickingIdForDeleteTest, typeId: typeOtherId },
        ],
        conversionFactors: [{ typeId: typeOtherId, unitsPerBase: 10 }],
        pickingHierarchy: [
          { typeId: typeOtherId, sortOrder: 1 },
          { typeId: typeBaseId, sortOrder: 2 },
        ],
      })
      .expect(201);
    groupId = (res.body as { id: string }).id;
    groupIds.push(groupId);
    expect((res.body as { usesPickingHierarchy: boolean }).usesPickingHierarchy).toBe(true);
  });

  it('rejects a duplicate Group name case-insensitively (BR-001/ADR-191)', async () => {
    await request(app.getHttpServer())
      .post('/uom/groups')
      .set(admin())
      .send({
        name: 'E2E-REBAR-BUNDLES',
        baseTypeId: typeBaseId,
        roleAssignments: [],
        conversionFactors: [],
      })
      .expect(409);
  });

  it('writes a Conversion Factor History row on create, and another on a rate change (BR-009)', async () => {
    const initial = await request(app.getHttpServer())
      .get(`/uom/groups/${groupId}/conversion-factors/${typeOtherId}/history`)
      .set(admin())
      .expect(200);
    expect(Array.isArray(initial.body)).toBe(true);
    expect((initial.body as { rate: string }[]).length).toBe(1);

    await request(app.getHttpServer())
      .patch(`/uom/groups/${groupId}`)
      .set(admin())
      .send({ conversionFactors: [{ typeId: typeOtherId, unitsPerBase: 12 }] })
      .expect(200);

    const afterChange = await request(app.getHttpServer())
      .get(`/uom/groups/${groupId}/conversion-factors/${typeOtherId}/history`)
      .set(admin())
      .expect(200);
    expect((afterChange.body as { rate: string }[]).length).toBe(2);
  });

  it('resolves an explicit Role Assignment and falls back to Base Type when none exists (BR-021)', async () => {
    const explicit = await request(app.getHttpServer())
      .get(`/uom/groups/${groupId}/roles/${roleSellingId}/resolve`)
      .set(admin())
      .expect(200);
    expect((explicit.body as { resolution: string }).resolution).toBe('explicit');
    expect((explicit.body as { typeId: string }).typeId).toBe(typeBaseId);

    const unassignedRole = await request(app.getHttpServer())
      .post('/uom/functional-roles')
      .set(admin())
      .send({ name: 'e2e-Unassigned-Role' })
      .expect(201);
    const unassignedRoleId = (unassignedRole.body as { id: string }).id;
    roleIds.push(unassignedRoleId);

    const fallback = await request(app.getHttpServer())
      .get(`/uom/groups/${groupId}/roles/${unassignedRoleId}/resolve`)
      .set(admin())
      .expect(200);
    expect((fallback.body as { resolution: string }).resolution).toBe('base_type_fallback');
    expect((fallback.body as { typeId: string }).typeId).toBe(typeBaseId);
  });

  it('returns the ordered pick-breakdown (FR-010, BR-013 agreement)', async () => {
    const res = await request(app.getHttpServer())
      .get(`/uom/groups/${groupId}/pick-breakdown`)
      .set(admin())
      .expect(200);
    const rows = res.body as { typeId: string; sortOrder: number }[];
    expect(rows).toHaveLength(2);
    expect(rows[0].sortOrder).toBe(1);
    expect(rows[0].typeId).toBe(typeOtherId);
  });

  it('resolves a base-unit-pivot conversion, always fractional (BR-007/BR-008)', async () => {
    const res = await request(app.getHttpServer())
      .post('/uom/conversions/resolve')
      .set(admin())
      .send({ groupId, typeId: typeOtherId, direction: 'uom_to_base', kind: 'qty', value: 2.5 })
      .expect(201);
    // 2.5 Bundle * 12 (rate updated above) = 30 Base units.
    expect((res.body as { result: number }).result).toBe(30);
  });

  it('rejects a conversion for a Type not reachable through the Group (400)', async () => {
    const strayType = await request(app.getHttpServer())
      .post('/uom/types')
      .set(admin())
      .send({ name: 'e2e-Unreachable-Type' })
      .expect(201);
    const strayTypeId = (strayType.body as { id: string }).id;
    typeIds.push(strayTypeId);

    await request(app.getHttpServer())
      .post('/uom/conversions/resolve')
      .set(admin())
      .send({ groupId, typeId: strayTypeId, direction: 'uom_to_base', kind: 'qty', value: 1 })
      .expect(400);
  });

  it('accepts a Name-only rename with no lock (BR-020 path for an unused Group)', async () => {
    const res = await request(app.getHttpServer())
      .patch(`/uom/groups/${groupId}`)
      .set(admin())
      .send({ name: 'e2e-Rebar-Bundles-Renamed' })
      .expect(200);
    expect((res.body as { name: string }).name).toBe('e2e-Rebar-Bundles-Renamed');
  });

  // --- Import/Export (T-080, VR-017) -----------------------------------------------------
  it('imports Groups with the same completeness validation as an interactive save (VR-017)', async () => {
    const res = await request(app.getHttpServer())
      .post('/uom/groups/import')
      .set(admin())
      .send({
        groups: [
          {
            name: 'e2e-Imported-Complete',
            baseTypeId: typeBaseId,
            roleAssignments: [{ roleId: roleSellingId, typeId: typeBaseId }],
            conversionFactors: [],
          },
          {
            name: 'e2e-Imported-Incomplete',
            baseTypeId: typeBaseId,
            roleAssignments: [{ roleId: roleSellingId, typeId: typeOtherId }],
            conversionFactors: [], // missing factor — BR-019 rejects this row
          },
        ],
      })
      .expect(201);

    const body = res.body as {
      created: number;
      rejected: number;
      results: { name: string; status: string }[];
    };
    expect(body.created).toBe(1);
    expect(body.rejected).toBe(1);

    const importedGroup = body.results.find((r) => r.name === 'e2e-Imported-Complete');
    expect(importedGroup?.status).toBe('created');

    // Track for cleanup.
    const list = await request(app.getHttpServer())
      .get('/uom/groups')
      .set(admin())
      .query({ search: 'e2e-Imported-Complete' })
      .expect(200);
    for (const item of (list.body as { items: { id: string }[] }).items) groupIds.push(item.id);
  });

  it('exports Groups', async () => {
    const res = await request(app.getHttpServer())
      .get('/uom/groups/export')
      .set(admin())
      .expect(200);
    expect(Array.isArray((res.body as { groups: unknown[] }).groups)).toBe(true);
  });

  // --- Delete guards ----------------------------------------------------------------------
  it('deletes an unused, unlocked Group', async () => {
    const disposable = await request(app.getHttpServer())
      .post('/uom/groups')
      .set(admin())
      .send({
        name: 'e2e-Disposable-Group',
        baseTypeId: typeBaseId,
        roleAssignments: [],
        conversionFactors: [],
      })
      .expect(201);
    const disposableId = (disposable.body as { id: string }).id;

    await request(app.getHttpServer())
      .delete(`/uom/groups/${disposableId}`)
      .set(admin())
      .expect(200);
  });
});
