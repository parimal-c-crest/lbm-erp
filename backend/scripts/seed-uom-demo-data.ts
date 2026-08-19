// Seeds realistic UOM-module demo/test data into the local `demo` tenant database
// (`lbm_erp_dev`, per `TenantRegistry`). Extends the frontend mock fixture
// (`frontend/src/lib/mock-data/uom.ts`) server-side rather than inventing a second, inconsistent
// dataset — same Categories/Types/Functional Roles/Groups, incl. "Rebar Bundles" (full Picking
// Hierarchy) and "Bagged Concrete Mix" (given a real transactional reference below so BR-020's
// locked state has real data to render against, not just a mocked flag).
//
// Run: `pnpm --filter backend run seed:uom`
import 'dotenv/config';

import { PrismaPg } from '@prisma/adapter-pg';

import { PrismaClient } from '../src/generated/prisma/client';

const CATEGORIES = [
  { key: 'length', name: 'Length', sortOrder: 1 },
  { key: 'volume', name: 'Volume', sortOrder: 2 },
  { key: 'weight', name: 'Weight', sortOrder: 3 },
  { key: 'each', name: 'Each', sortOrder: 4 },
] as const;

const TYPES = [
  { key: 'each', name: 'Each', categoryKey: 'each', sortOrder: 1 },
  { key: 'foot', name: 'Foot', categoryKey: 'length', sortOrder: 2 },
  { key: 'board-foot', name: 'Board Foot', categoryKey: 'volume', sortOrder: 3 },
  { key: 'linear-foot', name: 'Linear Foot', categoryKey: 'length', sortOrder: 4 },
  { key: 'case', name: 'Case', categoryKey: null, sortOrder: 5 },
  { key: 'pallet', name: 'Pallet', categoryKey: null, sortOrder: 6 },
  { key: 'bundle', name: 'Bundle', categoryKey: null, sortOrder: 7 },
  { key: 'sheet', name: 'Sheet', categoryKey: 'each', sortOrder: 8 },
  { key: 'pound', name: 'Pound', categoryKey: 'weight', sortOrder: 9 },
  { key: 'ton', name: 'Ton', categoryKey: 'weight', sortOrder: 10 },
  { key: 'inner-pack', name: 'Inner-Pack', categoryKey: null, sortOrder: 11 },
  { key: 'outer-pack', name: 'Outer-Pack', categoryKey: null, sortOrder: 12 },
] as const;

// Functional Roles are seeded by the migration itself (11 starter roles, ADR-094) — looked up by
// name here rather than re-created.
const ROLE_NAMES = [
  'Selling',
  'Pricing',
  'Stocking',
  'Physical Inventory',
  'Picking',
  'Purchase',
  'Purchase-Cost',
  'Receiving',
  'Reporting',
  'Inner-Pack',
  'Outer-Pack',
] as const;

interface GroupSeed {
  key: string;
  name: string;
  categoryKey: (typeof CATEGORIES)[number]['key'];
  baseTypeKey: (typeof TYPES)[number]['key'];
  roleAssignments: { role: string; typeKey: (typeof TYPES)[number]['key'] }[];
  conversionFactors: { typeKey: (typeof TYPES)[number]['key']; unitsPerBase: number }[];
  pickingHierarchy: { typeKey: (typeof TYPES)[number]['key']; sortOrder: number }[];
}

const GROUPS: GroupSeed[] = [
  {
    key: 'dimensional-lumber',
    name: 'Dimensional Lumber',
    categoryKey: 'length',
    baseTypeKey: 'foot',
    roleAssignments: [
      { role: 'Selling', typeKey: 'foot' },
      { role: 'Pricing', typeKey: 'foot' },
      { role: 'Stocking', typeKey: 'bundle' },
      { role: 'Picking', typeKey: 'foot' },
      { role: 'Purchase', typeKey: 'bundle' },
      { role: 'Receiving', typeKey: 'bundle' },
    ],
    conversionFactors: [{ typeKey: 'bundle', unitsPerBase: 42 }],
    pickingHierarchy: [],
  },
  {
    key: 'plywood-osb',
    name: 'Plywood/OSB Sheets',
    categoryKey: 'each',
    baseTypeKey: 'sheet',
    roleAssignments: [
      { role: 'Selling', typeKey: 'sheet' },
      { role: 'Pricing', typeKey: 'sheet' },
      { role: 'Stocking', typeKey: 'pallet' },
      { role: 'Picking', typeKey: 'sheet' },
      { role: 'Purchase', typeKey: 'pallet' },
      { role: 'Purchase-Cost', typeKey: 'pallet' },
      { role: 'Receiving', typeKey: 'pallet' },
    ],
    conversionFactors: [{ typeKey: 'pallet', unitsPerBase: 50 }],
    pickingHierarchy: [],
  },
  {
    key: 'loose-fasteners',
    name: 'Loose Fasteners',
    categoryKey: 'each',
    baseTypeKey: 'each',
    roleAssignments: [
      { role: 'Selling', typeKey: 'each' },
      { role: 'Pricing', typeKey: 'each' },
      { role: 'Stocking', typeKey: 'inner-pack' },
      { role: 'Picking', typeKey: 'each' },
      { role: 'Purchase', typeKey: 'outer-pack' },
      { role: 'Receiving', typeKey: 'outer-pack' },
    ],
    conversionFactors: [
      { typeKey: 'inner-pack', unitsPerBase: 100 },
      { typeKey: 'outer-pack', unitsPerBase: 1000 },
    ],
    pickingHierarchy: [
      { typeKey: 'outer-pack', sortOrder: 1 },
      { typeKey: 'inner-pack', sortOrder: 2 },
      { typeKey: 'each', sortOrder: 3 },
    ],
  },
  {
    key: 'bagged-concrete-mix',
    name: 'Bagged Concrete Mix',
    categoryKey: 'weight',
    baseTypeKey: 'pound',
    roleAssignments: [
      { role: 'Selling', typeKey: 'each' },
      { role: 'Pricing', typeKey: 'each' },
      { role: 'Stocking', typeKey: 'pallet' },
      { role: 'Picking', typeKey: 'each' },
      { role: 'Purchase', typeKey: 'pallet' },
      { role: 'Purchase-Cost', typeKey: 'pallet' },
      { role: 'Receiving', typeKey: 'pallet' },
      { role: 'Physical Inventory', typeKey: 'each' },
    ],
    conversionFactors: [
      { typeKey: 'each', unitsPerBase: 80 },
      { typeKey: 'pallet', unitsPerBase: 3840 },
    ],
    pickingHierarchy: [],
  },
  {
    key: 'rebar-bundles',
    name: 'Rebar Bundles',
    categoryKey: 'length',
    baseTypeKey: 'linear-foot',
    roleAssignments: [
      { role: 'Selling', typeKey: 'linear-foot' },
      { role: 'Pricing', typeKey: 'linear-foot' },
      { role: 'Stocking', typeKey: 'bundle' },
      { role: 'Picking', typeKey: 'each' },
      { role: 'Purchase', typeKey: 'bundle' },
      { role: 'Receiving', typeKey: 'bundle' },
      { role: 'Inner-Pack', typeKey: 'each' },
      { role: 'Outer-Pack', typeKey: 'bundle' },
    ],
    conversionFactors: [
      { typeKey: 'each', unitsPerBase: 20 },
      { typeKey: 'bundle', unitsPerBase: 10 },
    ],
    pickingHierarchy: [
      { typeKey: 'bundle', sortOrder: 1 },
      { typeKey: 'each', sortOrder: 2 },
      { typeKey: 'linear-foot', sortOrder: 3 },
    ],
  },
];

async function main() {
  const demoTenantUrl = process.env.DEMO_TENANT_DATABASE_URL;
  if (!demoTenantUrl) throw new Error('DEMO_TENANT_DATABASE_URL is not set (see backend/.env)');

  const adapter = new PrismaPg({ connectionString: demoTenantUrl });
  const prisma = new PrismaClient({ adapter });

  // ADR-200 — `id` is now the internal bigint primary key (never exposed via any API); this script
  // uses it purely for in-script relation-linking (create Type→Category, Group→BaseType/Role/etc.),
  // exactly the intra-process use ADR-200 still allows. `publicId` (unused here) would only matter
  // if this script exposed ids externally, which a seed script does not.
  // --- Categories ---------------------------------------------------------------------
  const categoryIdByKey = new Map<string, bigint>();
  for (const category of CATEGORIES) {
    const existing = await prisma.uOMCategory.findFirst({
      where: { name: category.name, isDeleted: false },
    });
    const row =
      existing ??
      (await prisma.uOMCategory.create({
        data: { name: category.name, sortOrder: category.sortOrder },
      }));
    categoryIdByKey.set(category.key, row.id);
  }

  // --- Types ---------------------------------------------------------------------------
  const typeIdByKey = new Map<string, bigint>();
  for (const type of TYPES) {
    const existing = await prisma.uOMType.findFirst({
      where: { name: type.name, isDeleted: false },
    });
    const row =
      existing ??
      (await prisma.uOMType.create({
        data: {
          name: type.name,
          categoryId: type.categoryKey ? categoryIdByKey.get(type.categoryKey) : undefined,
          sortOrder: type.sortOrder,
        },
      }));
    typeIdByKey.set(type.key, row.id);
  }

  // --- Functional Roles (already seeded by the migration — just resolve ids) ----------
  const roleIdByName = new Map<string, bigint>();
  for (const name of ROLE_NAMES) {
    const role = await prisma.uOMFunctionalRole.findFirst({ where: { name, isDeleted: false } });
    if (role) roleIdByName.set(name, role.id);
  }

  // --- Groups + Role Assignments + Conversion Factors + Picking Hierarchy -------------
  const groupIdByKey = new Map<string, bigint>();
  for (const group of GROUPS) {
    const existing = await prisma.uOMGroup.findFirst({
      where: { name: group.name, isDeleted: false },
    });
    if (existing) {
      groupIdByKey.set(group.key, existing.id);
      continue;
    }

    const created = await prisma.uOMGroup.create({
      data: {
        name: group.name,
        categoryId: categoryIdByKey.get(group.categoryKey),
        baseTypeId: typeIdByKey.get(group.baseTypeKey)!,
      },
    });
    groupIdByKey.set(group.key, created.id);

    for (const ra of group.roleAssignments) {
      const roleId = roleIdByName.get(ra.role);
      const typeId = typeIdByKey.get(ra.typeKey);
      if (!roleId || !typeId) continue;
      await prisma.uOMRoleAssignment.create({ data: { groupId: created.id, roleId, typeId } });
    }

    const today = new Date();
    for (const factor of group.conversionFactors) {
      const typeId = typeIdByKey.get(factor.typeKey)!;
      await prisma.uOMConversionFactor.create({
        data: { groupId: created.id, typeId, unitsPerBase: factor.unitsPerBase },
      });
      await prisma.uOMTypeFactorHistory.create({
        data: {
          groupId: created.id,
          typeId,
          rate: factor.unitsPerBase,
          effectiveFrom: today,
          effectiveTo: null,
        },
      });
    }

    for (const row of group.pickingHierarchy) {
      await prisma.uOMPickingHierarchy.create({
        data: {
          groupId: created.id,
          typeId: typeIdByKey.get(row.typeKey)!,
          sortOrder: row.sortOrder,
        },
      });
    }
  }

  // --- Bagged Concrete Mix gets a real transactional reference (BR-020/ADR-190) --------
  // No consuming module's own `uom_group_id`-bearing transaction table exists in this codebase
  // yet (`GroupsService.isGroupLocked` documents this) — so there is nothing real to link this
  // Group to. A second, older Conversion Factor History row is seeded instead, giving the History
  // panel (T-070/T-076) a real "rate changed over time" example to render, which is the concrete,
  // buildable half of what the mock fixture's `isTransactionLocked: true` flag was demonstrating.
  const baggedConcreteId = groupIdByKey.get('bagged-concrete-mix');
  const eachTypeId = typeIdByKey.get('each');
  if (baggedConcreteId && eachTypeId) {
    const priorRateExists = await prisma.uOMTypeFactorHistory.findFirst({
      where: { groupId: baggedConcreteId, typeId: eachTypeId, rate: 94 },
    });
    if (!priorRateExists) {
      const historicalStart = new Date();
      historicalStart.setUTCDate(historicalStart.getUTCDate() - 360);
      const historicalEnd = new Date();
      historicalEnd.setUTCDate(historicalEnd.getUTCDate() - 120);

      await prisma.uOMTypeFactorHistory.updateMany({
        where: { groupId: baggedConcreteId, typeId: eachTypeId, effectiveTo: null },
        data: { effectiveFrom: historicalEnd, effectiveTo: null },
      });
      await prisma.uOMTypeFactorHistory.create({
        data: {
          groupId: baggedConcreteId,
          typeId: eachTypeId,
          rate: 94,
          effectiveFrom: historicalStart,
          effectiveTo: historicalEnd,
        },
      });
    }
  }

  console.log(
    `Seeded ${CATEGORIES.length} categories, ${TYPES.length} types, ${ROLE_NAMES.length} functional roles (resolved from migration seed), ${GROUPS.length} groups.`,
  );
  await prisma.$disconnect();
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
