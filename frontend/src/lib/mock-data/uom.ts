import { faker } from '@faker-js/faker';

import type {
  UOMCategory,
  UOMFunctionalRole,
  UOMGroup,
  UOMTypeFactorHistoryEntry,
  UOMType,
} from '@/types/uom';

// Shared UOM-module mock dataset (T-072) — one fixture imported by every page so navigating
// between them shows consistent data, not independently randomized values per page (Module
// Design-First Strategy, `8-implementation/1-implement-task.md`). Generic fields (audit
// name/timestamp filler) use `@faker-js/faker`; Category/Type/Functional Role/Group names are
// hand-written, domain-real per `docs-kit/5-modules/uom/1-module.md` (a real lumber-yard/
// building-materials distributor's own units) — not faker output, per that same strategy's split.

faker.seed(20260818); // deterministic across renders/reloads — a fixture, not live random data.

const AUDIT_USER = 'Marcus Whitfield';

function isoDaysAgo(days: number) {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date.toISOString();
}

// --- Categories (BR-... / `9-ui.md` §4 Category List/Edit) ----------------------------------

export const MOCK_CATEGORIES: UOMCategory[] = [
  { id: 'cat-length', name: 'Length', sortOrder: 1, createdAt: isoDaysAgo(400) },
  { id: 'cat-volume', name: 'Volume', sortOrder: 2, createdAt: isoDaysAgo(400) },
  { id: 'cat-weight', name: 'Weight', sortOrder: 3, createdAt: isoDaysAgo(400) },
  { id: 'cat-each', name: 'Each', sortOrder: 4, createdAt: isoDaysAgo(400) },
];

// --- Types — real lumber-yard units (`9-ui.md` §4 Type List/Edit, ADR-192 optional Category) ---

export const MOCK_TYPES: UOMType[] = [
  { id: 'type-each', name: 'Each', categoryId: 'cat-each', sortOrder: 1, createdAt: isoDaysAgo(400) },
  { id: 'type-foot', name: 'Foot', categoryId: 'cat-length', sortOrder: 2, createdAt: isoDaysAgo(400) },
  { id: 'type-board-foot', name: 'Board Foot', categoryId: 'cat-volume', sortOrder: 3, createdAt: isoDaysAgo(400) },
  { id: 'type-linear-foot', name: 'Linear Foot', categoryId: 'cat-length', sortOrder: 4, createdAt: isoDaysAgo(400) },
  { id: 'type-case', name: 'Case', categoryId: null, sortOrder: 5, createdAt: isoDaysAgo(400) },
  { id: 'type-pallet', name: 'Pallet', categoryId: null, sortOrder: 6, createdAt: isoDaysAgo(400) },
  { id: 'type-bundle', name: 'Bundle', categoryId: null, sortOrder: 7, createdAt: isoDaysAgo(400) },
  { id: 'type-sheet', name: 'Sheet', categoryId: 'cat-each', sortOrder: 8, createdAt: isoDaysAgo(400) },
  { id: 'type-pound', name: 'Pound', categoryId: 'cat-weight', sortOrder: 9, createdAt: isoDaysAgo(400) },
  { id: 'type-ton', name: 'Ton', categoryId: 'cat-weight', sortOrder: 10, createdAt: isoDaysAgo(400) },
  { id: 'type-inner-pack', name: 'Inner-Pack', categoryId: null, sortOrder: 11, createdAt: isoDaysAgo(400) },
  { id: 'type-outer-pack', name: 'Outer-Pack', categoryId: null, sortOrder: 12, createdAt: isoDaysAgo(400) },
];

// --- Functional Roles — the 11 seeded starter roles (`5-data-dictionary.md` §5, ADR-094) ------

export const MOCK_FUNCTIONAL_ROLES: UOMFunctionalRole[] = [
  { id: 'role-selling', name: 'Selling', sortOrder: 1, createdAt: isoDaysAgo(400) },
  { id: 'role-pricing', name: 'Pricing', sortOrder: 2, createdAt: isoDaysAgo(400) },
  { id: 'role-stocking', name: 'Stocking', sortOrder: 3, createdAt: isoDaysAgo(400) },
  { id: 'role-physical-inventory', name: 'Physical Inventory', sortOrder: 4, createdAt: isoDaysAgo(400) },
  { id: 'role-picking', name: 'Picking', sortOrder: 5, createdAt: isoDaysAgo(400) },
  { id: 'role-purchase', name: 'Purchase', sortOrder: 6, createdAt: isoDaysAgo(400) },
  { id: 'role-purchase-cost', name: 'Purchase-Cost', sortOrder: 7, createdAt: isoDaysAgo(400) },
  { id: 'role-receiving', name: 'Receiving', sortOrder: 8, createdAt: isoDaysAgo(400) },
  { id: 'role-reporting', name: 'Reporting', sortOrder: 9, createdAt: isoDaysAgo(400) },
  { id: 'role-inner-pack', name: 'Inner-Pack', sortOrder: 10, createdAt: isoDaysAgo(400) },
  { id: 'role-outer-pack', name: 'Outer-Pack', sortOrder: 11, createdAt: isoDaysAgo(400) },
];

// --- Groups — real building-materials distributor bundles (`9-ui.md` §4 Group List/Detail) ----
// One Group ("Rebar Bundles") carries a full Picking Hierarchy; one Group ("Bagged Concrete Mix")
// is flagged `isTransactionLocked` so the Group Detail locked-state UI (BR-020/ADR-190) has real
// data to render against.

export const MOCK_GROUPS: UOMGroup[] = [
  {
    id: 'group-dimensional-lumber',
    name: 'Dimensional Lumber',
    categoryId: 'cat-length',
    baseTypeId: 'type-foot',
    roleAssignments: [
      { roleId: 'role-selling', typeId: 'type-foot' },
      { roleId: 'role-pricing', typeId: 'type-foot' },
      { roleId: 'role-stocking', typeId: 'type-bundle' },
      { roleId: 'role-picking', typeId: 'type-foot' },
      { roleId: 'role-purchase', typeId: 'type-bundle' },
      { roleId: 'role-receiving', typeId: 'type-bundle' },
    ],
    conversionFactors: [{ typeId: 'type-bundle', unitsPerBase: 42 }],
    pickingHierarchy: [],
    isTransactionLocked: false,
    createdAt: isoDaysAgo(380),
    updatedAt: isoDaysAgo(30),
    createdBy: AUDIT_USER,
    updatedBy: AUDIT_USER,
  },
  {
    id: 'group-plywood-osb',
    name: 'Plywood/OSB Sheets',
    categoryId: 'cat-each',
    baseTypeId: 'type-sheet',
    roleAssignments: [
      { roleId: 'role-selling', typeId: 'type-sheet' },
      { roleId: 'role-pricing', typeId: 'type-sheet' },
      { roleId: 'role-stocking', typeId: 'type-pallet' },
      { roleId: 'role-picking', typeId: 'type-sheet' },
      { roleId: 'role-purchase', typeId: 'type-pallet' },
      { roleId: 'role-purchase-cost', typeId: 'type-pallet' },
      { roleId: 'role-receiving', typeId: 'type-pallet' },
    ],
    conversionFactors: [{ typeId: 'type-pallet', unitsPerBase: 50 }],
    pickingHierarchy: [],
    isTransactionLocked: false,
    createdAt: isoDaysAgo(375),
    updatedAt: isoDaysAgo(45),
    createdBy: AUDIT_USER,
    updatedBy: AUDIT_USER,
  },
  {
    id: 'group-loose-fasteners',
    name: 'Loose Fasteners',
    categoryId: 'cat-each',
    baseTypeId: 'type-each',
    roleAssignments: [
      { roleId: 'role-selling', typeId: 'type-each' },
      { roleId: 'role-pricing', typeId: 'type-each' },
      { roleId: 'role-stocking', typeId: 'type-inner-pack' },
      { roleId: 'role-picking', typeId: 'type-each' },
      { roleId: 'role-purchase', typeId: 'type-outer-pack' },
      { roleId: 'role-receiving', typeId: 'type-outer-pack' },
    ],
    conversionFactors: [
      { typeId: 'type-inner-pack', unitsPerBase: 100 },
      { typeId: 'type-outer-pack', unitsPerBase: 1000 },
    ],
    pickingHierarchy: [
      { typeId: 'type-outer-pack', sortOrder: 1 },
      { typeId: 'type-inner-pack', sortOrder: 2 },
      { typeId: 'type-each', sortOrder: 3 },
    ],
    isTransactionLocked: false,
    createdAt: isoDaysAgo(370),
    updatedAt: isoDaysAgo(20),
    createdBy: AUDIT_USER,
    updatedBy: AUDIT_USER,
  },
  {
    id: 'group-bagged-concrete-mix',
    name: 'Bagged Concrete Mix',
    categoryId: 'cat-weight',
    baseTypeId: 'type-pound',
    roleAssignments: [
      { roleId: 'role-selling', typeId: 'type-each' },
      { roleId: 'role-pricing', typeId: 'type-each' },
      { roleId: 'role-stocking', typeId: 'type-pallet' },
      { roleId: 'role-picking', typeId: 'type-each' },
      { roleId: 'role-purchase', typeId: 'type-pallet' },
      { roleId: 'role-purchase-cost', typeId: 'type-pallet' },
      { roleId: 'role-receiving', typeId: 'type-pallet' },
      { roleId: 'role-physical-inventory', typeId: 'type-each' },
    ],
    conversionFactors: [
      { typeId: 'type-each', unitsPerBase: 80 },
      { typeId: 'type-pallet', unitsPerBase: 3840 },
    ],
    pickingHierarchy: [],
    // Mocked transaction-referenced/locked Group (BR-020/ADR-190) — used to demo the Group Detail
    // locked-state banner, disabled fields (except Name), and disabled Delete.
    isTransactionLocked: true,
    createdAt: isoDaysAgo(360),
    updatedAt: isoDaysAgo(3),
    createdBy: AUDIT_USER,
    updatedBy: AUDIT_USER,
  },
  {
    id: 'group-rebar-bundles',
    name: 'Rebar Bundles',
    categoryId: 'cat-length',
    baseTypeId: 'type-linear-foot',
    roleAssignments: [
      { roleId: 'role-selling', typeId: 'type-linear-foot' },
      { roleId: 'role-pricing', typeId: 'type-linear-foot' },
      { roleId: 'role-stocking', typeId: 'type-bundle' },
      { roleId: 'role-picking', typeId: 'type-each' },
      { roleId: 'role-purchase', typeId: 'type-bundle' },
      { roleId: 'role-receiving', typeId: 'type-bundle' },
      { roleId: 'role-inner-pack', typeId: 'type-each' },
      { roleId: 'role-outer-pack', typeId: 'type-bundle' },
    ],
    conversionFactors: [
      { typeId: 'type-each', unitsPerBase: 20 },
      { typeId: 'type-bundle', unitsPerBase: 10 },
    ],
    // Full Picking Hierarchy (T-072/T-069 requirement) — largest unit first.
    pickingHierarchy: [
      { typeId: 'type-bundle', sortOrder: 1 },
      { typeId: 'type-each', sortOrder: 2 },
      { typeId: 'type-linear-foot', sortOrder: 3 },
    ],
    isTransactionLocked: false,
    createdAt: isoDaysAgo(350),
    updatedAt: isoDaysAgo(10),
    createdBy: AUDIT_USER,
    updatedBy: AUDIT_USER,
  },
];

// --- Conversion Factor History (T-070) — a couple of seeded entries so the History panel has ---
// real rows to show for at least one (Group, Type) pair, and an empty state for the rest.

export const MOCK_FACTOR_HISTORY: UOMTypeFactorHistoryEntry[] = [
  {
    id: 'hist-001',
    typeId: 'type-each', // group-bagged-concrete-mix's Each factor
    rate: 94,
    effectiveFrom: isoDaysAgo(360).slice(0, 10),
    effectiveTo: isoDaysAgo(120).slice(0, 10),
  },
  {
    id: 'hist-002',
    typeId: 'type-each',
    rate: 80,
    effectiveFrom: isoDaysAgo(120).slice(0, 10),
    effectiveTo: null, // current
  },
];

/** Every (Group, Type) history lookup keys off this map — `group-bagged-concrete-mix` + `type-each`
 * is the only pair with real history in this fixture; every other pair returns an empty list. */
export function historyFor(groupId: string, typeId: string): UOMTypeFactorHistoryEntry[] {
  if (groupId === 'group-bagged-concrete-mix' && typeId === 'type-each') {
    return MOCK_FACTOR_HISTORY;
  }
  return [];
}

// --- Lookups --------------------------------------------------------------------------------

export function categoryNameFor(categoryId: string | null): string {
  if (!categoryId) {return '—';}
  return MOCK_CATEGORIES.find((category) => category.id === categoryId)?.name ?? '—';
}

export function typeNameFor(typeId: string | null): string {
  if (!typeId) {return '—';}
  return MOCK_TYPES.find((type) => type.id === typeId)?.name ?? '—';
}

export function roleNameFor(roleId: string): string {
  return MOCK_FUNCTIONAL_ROLES.find((role) => role.id === roleId)?.name ?? roleId;
}

/** BR-013/ADR-192 — computed, not stored: a Group "uses picking hierarchy" iff it has at least one row. */
export function usesPickingHierarchy(group: UOMGroup): boolean {
  return group.pickingHierarchy.length > 0;
}

// --- Category CRUD (T-065) -------------------------------------------------------------------

function nextId(prefix: string) {
  return `${prefix}-${faker.string.alphanumeric({ length: 8, casing: 'lower' })}`;
}

export function addCategory(input: { name: string; sortOrder: number }): UOMCategory {
  const category: UOMCategory = { id: nextId('cat'), name: input.name, sortOrder: input.sortOrder, createdAt: new Date().toISOString() };
  MOCK_CATEGORIES.push(category);
  return category;
}

export function updateCategory(id: string, input: { name: string; sortOrder: number }) {
  const category = MOCK_CATEGORIES.find((candidate) => candidate.id === id);
  if (category) {
    category.name = input.name;
    category.sortOrder = input.sortOrder;
  }
}

/** BR-014 in-use guard — Category is referenced by any Type or Group. Returns a rejection reason
 * (naming the reference), or null when the delete may proceed. */
export function categoryDeleteGuard(id: string): string | null {
  const typeCount = MOCK_TYPES.filter((type) => type.categoryId === id).length;
  const groupCount = MOCK_GROUPS.filter((group) => group.categoryId === id).length;
  if (typeCount === 0 && groupCount === 0) {return null;}
  const parts: string[] = [];
  if (typeCount > 0) {parts.push(`${typeCount} Type${typeCount === 1 ? '' : 's'}`);}
  if (groupCount > 0) {parts.push(`${groupCount} Group${groupCount === 1 ? '' : 's'}`);}
  return `Still in use by ${parts.join(' and ')} — remove those references first.`;
}

export function removeCategory(id: string): { ok: boolean; error?: string } {
  const reason = categoryDeleteGuard(id);
  if (reason) {return { ok: false, error: reason };}
  const index = MOCK_CATEGORIES.findIndex((category) => category.id === id);
  if (index !== -1) {MOCK_CATEGORIES.splice(index, 1);}
  return { ok: true };
}

// --- Type CRUD (T-066) ------------------------------------------------------------------------

export function addType(input: { name: string; categoryId: string | null; sortOrder: number }): UOMType {
  const type: UOMType = { id: nextId('type'), name: input.name, categoryId: input.categoryId, sortOrder: input.sortOrder, createdAt: new Date().toISOString() };
  MOCK_TYPES.push(type);
  return type;
}

export function updateType(id: string, input: { name: string; categoryId: string | null; sortOrder: number }) {
  const type = MOCK_TYPES.find((candidate) => candidate.id === id);
  if (type) {
    type.name = input.name;
    type.categoryId = input.categoryId;
    type.sortOrder = input.sortOrder;
  }
}

/** BR-014 in-use guard — Type is referenced by any Group's Base Type, Role Assignment, Conversion
 * Factor, or Picking Hierarchy row. Names the specific reference type, per `9-ui.md` §4. */
export function typeDeleteGuard(id: string): string | null {
  const reasons: string[] = [];
  if (MOCK_GROUPS.some((group) => group.baseTypeId === id)) {reasons.push('a Group Base Type');}
  if (MOCK_GROUPS.some((group) => group.roleAssignments.some((assignment) => assignment.typeId === id))) {reasons.push('a Role Assignment');}
  if (MOCK_GROUPS.some((group) => group.conversionFactors.some((factor) => factor.typeId === id))) {reasons.push('a Conversion Factor');}
  if (MOCK_GROUPS.some((group) => group.pickingHierarchy.some((row) => row.typeId === id))) {reasons.push('a Picking Hierarchy row');}
  if (reasons.length === 0) {return null;}
  return `Still in use as ${reasons.join(', ')} — remove those references first.`;
}

export function removeType(id: string): { ok: boolean; error?: string } {
  const reason = typeDeleteGuard(id);
  if (reason) {return { ok: false, error: reason };}
  const index = MOCK_TYPES.findIndex((type) => type.id === id);
  if (index !== -1) {MOCK_TYPES.splice(index, 1);}
  return { ok: true };
}

// --- Functional Role CRUD (T-067) --------------------------------------------------------------

export function addFunctionalRole(input: { name: string; sortOrder: number }): UOMFunctionalRole {
  const role: UOMFunctionalRole = { id: nextId('role'), name: input.name, sortOrder: input.sortOrder, createdAt: new Date().toISOString() };
  MOCK_FUNCTIONAL_ROLES.push(role);
  return role;
}

export function updateFunctionalRole(id: string, input: { name: string; sortOrder: number }) {
  const role = MOCK_FUNCTIONAL_ROLES.find((candidate) => candidate.id === id);
  if (role) {
    role.name = input.name;
    role.sortOrder = input.sortOrder;
  }
}

/** BR-014/ADR-192 in-use guard — Functional Role is referenced by any Group's Role Assignment. */
export function functionalRoleDeleteGuard(id: string): string | null {
  const groupNames = MOCK_GROUPS.filter((group) => group.roleAssignments.some((assignment) => assignment.roleId === id)).map((group) => group.name);
  if (groupNames.length === 0) {return null;}
  return `Still assigned on: ${groupNames.join(', ')} — remove those Role Assignments first.`;
}

export function removeFunctionalRole(id: string): { ok: boolean; error?: string } {
  const reason = functionalRoleDeleteGuard(id);
  if (reason) {return { ok: false, error: reason };}
  const index = MOCK_FUNCTIONAL_ROLES.findIndex((role) => role.id === id);
  if (index !== -1) {MOCK_FUNCTIONAL_ROLES.splice(index, 1);}
  return { ok: true };
}

// --- Group CRUD (T-068/T-069) ------------------------------------------------------------------

export function roleCountFor(group: UOMGroup): string {
  return `${group.roleAssignments.length}/${MOCK_FUNCTIONAL_ROLES.length} roles assigned`;
}

export interface GroupSaveInput {
  name: string;
  categoryId: string | null;
  baseTypeId: string;
  roleAssignments: { roleId: string; typeId: string }[];
  conversionFactors: { typeId: string; unitsPerBase: number }[];
  pickingHierarchy: { typeId: string; sortOrder: number }[];
}

/** BR-001/ADR-191 — case-insensitive Group name uniqueness, on create and rename alike. */
export function isGroupNameTaken(name: string, excludeId?: string): boolean {
  const normalized = name.trim().toLowerCase();
  return MOCK_GROUPS.some((group) => group.id !== excludeId && group.name.trim().toLowerCase() === normalized);
}

/** BR-019 — every role-assigned, non-Base-Type must have a Conversion Factor row before save.
 * Returns every offending Role/Type name (not just the first), per `6-validation.md`. */
export function groupCompletenessErrors(input: GroupSaveInput): string[] {
  const errors: string[] = [];
  const factorTypeIds = new Set(input.conversionFactors.map((factor) => factor.typeId));
  for (const assignment of input.roleAssignments) {
    if (assignment.typeId === input.baseTypeId) {continue;} // Base Type is implicitly 1, BR-003
    if (!factorTypeIds.has(assignment.typeId)) {
      errors.push(`${roleNameFor(assignment.roleId)} (${typeNameFor(assignment.typeId)}) is missing a Conversion Factor`);
    }
  }
  return errors;
}

export function addGroup(input: GroupSaveInput): UOMGroup {
  const group: UOMGroup = {
    id: nextId('group'),
    name: input.name,
    categoryId: input.categoryId,
    baseTypeId: input.baseTypeId,
    roleAssignments: input.roleAssignments,
    conversionFactors: input.conversionFactors,
    pickingHierarchy: input.pickingHierarchy,
    isTransactionLocked: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    createdBy: AUDIT_USER,
    updatedBy: AUDIT_USER,
  };
  MOCK_GROUPS.push(group);
  return group;
}

export function updateGroup(id: string, input: GroupSaveInput) {
  const group = MOCK_GROUPS.find((candidate) => candidate.id === id);
  if (!group) {return;}
  // BR-020/ADR-190 — locked Groups may only have their Name updated; every other field is a no-op
  // here (the UI already disables those inputs — this mirrors the server's own enforcement, VR-018).
  group.name = input.name;
  if (!group.isTransactionLocked) {
    group.categoryId = input.categoryId;
    group.baseTypeId = input.baseTypeId;
    group.roleAssignments = input.roleAssignments;
    group.conversionFactors = input.conversionFactors;
    group.pickingHierarchy = input.pickingHierarchy;
  }
  group.updatedAt = new Date().toISOString();
  group.updatedBy = AUDIT_USER;
}

/** `open-questions.md` UOM-FX-OQ-006 — Group delete is blocked while a Product still references it;
 * this mock has no Products fixture wired, so the only mocked block is the transaction lock itself. */
export function removeGroup(id: string): { ok: boolean; error?: string } {
  const group = MOCK_GROUPS.find((candidate) => candidate.id === id);
  if (group?.isTransactionLocked) {
    return { ok: false, error: 'This Group is in use on one or more transactions and cannot be deleted.' };
  }
  const index = MOCK_GROUPS.findIndex((candidate) => candidate.id === id);
  if (index !== -1) {MOCK_GROUPS.splice(index, 1);}
  return { ok: true };
}
