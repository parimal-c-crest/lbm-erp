import { apiFetch, errorMessage } from '@/lib/api';
import type {
  UOMCategory,
  UOMFunctionalRole,
  UOMGroup,
  UOMGroupSummary,
  UOMType,
  UOMTypeFactorHistoryEntry,
} from '@/types/uom';

// Real UOM backend client (EPIC-011) — replaces `lib/mock-data/uom.ts` as the pages' data source
// (Module Design-First Strategy step 9, `8-implementation/1-implement-task.md`). Reuses the
// existing `apiFetch` dev-token wrapper (`lib/api.ts`) rather than inventing a second HTTP client.
// `X-Tenant-Subdomain: demo` is hardcoded here the same way the dev-token flow is dev-only —
// real tenant resolution (subdomain routing) is Users/Platform-Administration's own concern, not
// rebuilt here.

function headers(): HeadersInit {
  return { 'X-Tenant-Subdomain': 'demo' };
}

// `errorMessage` moved to `lib/api.ts` (shared by every module's API client, not UOM-specific) —
// re-exported here so existing imports of it from this file keep working.
export { errorMessage };

interface Page<T> {
  items: T[];
  total: number;
}

// --- Categories ---------------------------------------------------------------------------

export function listCategories() {
  return apiFetch<Page<UOMCategory>>('/uom/categories?take=200', { headers: headers() });
}
export function createCategory(input: { name: string; sortOrder: number }) {
  return apiFetch<UOMCategory>('/uom/categories', {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify(input),
  });
}
export function updateCategory(id: string, input: { name: string; sortOrder: number }) {
  return apiFetch<UOMCategory>(`/uom/categories/${id}`, {
    method: 'PATCH',
    headers: headers(),
    body: JSON.stringify(input),
  });
}
export function deleteCategory(id: string) {
  return apiFetch<void>(`/uom/categories/${id}`, { method: 'DELETE', headers: headers() });
}

// --- Types ---------------------------------------------------------------------------------

export function listTypes() {
  return apiFetch<Page<UOMType>>('/uom/types?take=500', { headers: headers() });
}
export function createType(input: { name: string; categoryId: string | null; sortOrder: number }) {
  return apiFetch<UOMType>('/uom/types', {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({ name: input.name, categoryId: input.categoryId ?? undefined, sortOrder: input.sortOrder }),
  });
}
export function updateType(id: string, input: { name: string; categoryId: string | null; sortOrder: number }) {
  return apiFetch<UOMType>(`/uom/types/${id}`, {
    method: 'PATCH',
    headers: headers(),
    body: JSON.stringify({ name: input.name, categoryId: input.categoryId ?? undefined, sortOrder: input.sortOrder }),
  });
}
export function deleteType(id: string) {
  return apiFetch<void>(`/uom/types/${id}`, { method: 'DELETE', headers: headers() });
}

// --- Functional Roles ------------------------------------------------------------------------

export function listFunctionalRoles() {
  return apiFetch<Page<UOMFunctionalRole>>('/uom/functional-roles?take=200', { headers: headers() });
}
export function createFunctionalRole(input: { name: string; sortOrder: number }) {
  return apiFetch<UOMFunctionalRole>('/uom/functional-roles', {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify(input),
  });
}
export function updateFunctionalRole(id: string, input: { name: string; sortOrder: number }) {
  return apiFetch<UOMFunctionalRole>(`/uom/functional-roles/${id}`, {
    method: 'PATCH',
    headers: headers(),
    body: JSON.stringify(input),
  });
}
export function deleteFunctionalRole(id: string) {
  return apiFetch<void>(`/uom/functional-roles/${id}`, { method: 'DELETE', headers: headers() });
}

// --- Groups ----------------------------------------------------------------------------------

export interface GroupSaveInput {
  name: string;
  categoryId: string | null;
  baseTypeId: string;
  roleAssignments: { roleId: string; typeId: string }[];
  conversionFactors: { typeId: string; unitsPerBase: number }[];
  pickingHierarchy: { typeId: string; sortOrder: number }[];
}

export function listGroups(params?: { search?: string }) {
  const query = params?.search ? `?search=${encodeURIComponent(params.search)}&take=200` : '?take=200';
  return apiFetch<Page<UOMGroupSummary>>(`/uom/groups${query}`, {
    headers: headers(),
  });
}
export function getGroup(id: string) {
  return apiFetch<UOMGroup & { usesPickingHierarchy: boolean }>(`/uom/groups/${id}`, { headers: headers() });
}
export function createGroup(input: GroupSaveInput) {
  return apiFetch<UOMGroup>('/uom/groups', {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({ ...input, categoryId: input.categoryId ?? undefined }),
  });
}
export function updateGroup(id: string, input: Partial<GroupSaveInput>) {
  return apiFetch<UOMGroup>(`/uom/groups/${id}`, {
    method: 'PATCH',
    headers: headers(),
    body: JSON.stringify({ ...input, categoryId: input.categoryId ?? undefined }),
  });
}
export function deleteGroup(id: string) {
  return apiFetch<void>(`/uom/groups/${id}`, { method: 'DELETE', headers: headers() });
}
export function getFactorHistory(groupId: string, typeId: string) {
  return apiFetch<UOMTypeFactorHistoryEntry[]>(
    `/uom/groups/${groupId}/conversion-factors/${typeId}/history`,
    { headers: headers() },
  );
}
export function importGroups(groups: GroupSaveInput[]) {
  return apiFetch<{
    total: number;
    created: number;
    rejected: number;
    results: { row: number; name: string; status: string; error?: string }[];
  }>('/uom/groups/import', {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({ groups }),
  });
}
export function exportGroups() {
  return apiFetch<{ total: number; groups: UOMGroup[] }>('/uom/groups/export', { headers: headers() });
}

// --- Lookups used across pages/components (name-by-id, in-use error text) -------------------

export function typeNameFrom(types: UOMType[], typeId: string | null): string {
  if (!typeId) {return '—';}
  return types.find((type) => type.id === typeId)?.name ?? '—';
}
export function categoryNameFrom(categories: UOMCategory[], categoryId: string | null): string {
  if (!categoryId) {return '—';}
  return categories.find((category) => category.id === categoryId)?.name ?? '—';
}
export function roleNameFrom(roles: UOMFunctionalRole[], roleId: string): string {
  return roles.find((role) => role.id === roleId)?.name ?? roleId;
}
