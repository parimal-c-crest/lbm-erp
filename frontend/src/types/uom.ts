// UOM module shared types (T-072) — mirrors `docs-kit/5-modules/uom/4-schema.md` §4 field shapes
// and `5-data-dictionary.md`, ahead of the real backend (EPIC-011). Kept intentionally narrow to
// what the UI-Design epic's pages need (`8-implementation/1-implement-task.md` Module Design-First
// Strategy) — not a 1:1 Prisma model mirror.

export interface UOMCategory {
  id: string;
  name: string;
  sortOrder: number;
  createdAt: string;
}

export interface UOMType {
  id: string;
  name: string;
  categoryId: string | null;
  sortOrder: number;
  createdAt: string;
}

export interface UOMFunctionalRole {
  id: string;
  name: string;
  sortOrder: number;
  createdAt: string;
}

export interface UOMRoleAssignment {
  roleId: string;
  typeId: string;
}

export interface UOMConversionFactor {
  typeId: string;
  unitsPerBase: number;
}

export interface UOMTypeFactorHistoryEntry {
  id: string;
  typeId: string;
  rate: number;
  effectiveFrom: string;
  effectiveTo: string | null;
}

export interface UOMPickingHierarchyRow {
  typeId: string;
  sortOrder: number;
}

export interface UOMGroup {
  id: string;
  name: string;
  categoryId: string | null;
  baseTypeId: string;
  roleAssignments: UOMRoleAssignment[];
  conversionFactors: UOMConversionFactor[];
  pickingHierarchy: UOMPickingHierarchyRow[];
  // Mock-only flag standing in for the real transaction-reference existence check
  // (`4-schema.md` §9 "Transaction-Reference Lock Check", ADR-190/BR-020) — EPIC-011 replaces this
  // with a real `isGroupLocked(groupId)` service call; here it's just seeded `true` on one Group so
  // the locked-state UI (T-069) has real data to render against.
  isTransactionLocked: boolean;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  updatedBy: string;
}

// `GET /uom/groups` list summary (`8-api.md` §"GET /uom/groups") — deliberately excludes the
// nested Role Assignment/Conversion Factor/Picking Hierarchy detail (fetched via the detail
// endpoint instead); carries `roleAssignmentCount` for the Group List's "UOM Roles" column instead
// of the full array. Not the same shape as `UOMGroup` (the detail response) — don't conflate them.
export interface UOMGroupSummary {
  id: string;
  name: string;
  categoryId: string | null;
  baseTypeId: string;
  usesPickingHierarchy: boolean;
  roleAssignmentCount: number;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  updatedBy: string;
}
