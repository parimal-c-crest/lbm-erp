'use client';

import { AlertTriangle, History, Plus } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';

import { ConversionFactorHistorySheet } from '@/components/shared/ConversionFactorHistorySheet';
import { PickingHierarchyList } from '@/components/shared/PickingHierarchyList';
import { UomSubNav } from '@/components/shared/UomSubNav';
import { Button } from '@/components/ui/button';
import { FormField } from '@/components/ui/form-field';
import {
  createGroup,
  deleteGroup,
  errorMessage,
  listCategories,
  listFunctionalRoles,
  listTypes,
  typeNameFrom,
  updateGroup,
} from '@/lib/api/uom';
import type { UOMCategory, UOMFunctionalRole, UOMGroup, UOMType } from '@/types/uom';

// Group Detail/Edit (`docs-kit/5-modules/uom/9-ui.md` §4 Group Detail/Edit) — the central UOM
// screen: header (Name, Category, Base Type, read-only computed Picking-Hierarchy indicator) +
// Role Assignments + Conversion Factors + Picking Hierarchy, one atomic save. Shared between
// `groups/[id]/page.tsx` (edit) and `groups/new/page.tsx` (create) — same form either way, per
// the User module's own Create/Edit pattern (`UserForm.tsx`). Wired to the real backend
// (EPIC-011, T-075) — reference lists (Category/Type/Functional Role) and the save/delete calls
// all hit the real API; `lib/mock-data/uom.ts` is no longer imported here.
export function UomGroupForm({ group }: { group?: UOMGroup }) {
  const router = useRouter();
  const isEdit = Boolean(group);
  // No consuming module exists yet, so `isGroupLocked` always resolves false server-side
  // (`GroupsService.isGroupLocked`) — nothing to reflect in the UI as "locked" today. Kept as a
  // constant (not deleted outright) so a future PATCH 409 `GROUP_LOCKED` response still renders
  // through the generic `saveError` banner below rather than needing new UI wiring later.
  const isLocked = false;

  const [categories, setCategories] = useState<UOMCategory[]>([]);
  const [types, setTypes] = useState<UOMType[]>([]);
  const [roles, setRoles] = useState<UOMFunctionalRole[]>([]);
  const [refDataError, setRefDataError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([listCategories(), listTypes(), listFunctionalRoles()])
      .then(([categoriesPage, typesPage, rolesPage]) => {
        setCategories(categoriesPage.items);
        setTypes(typesPage.items);
        setRoles(rolesPage.items);
      })
      .catch((error: unknown) => setRefDataError(errorMessage(error)));
  }, []);

  const [name, setName] = useState(group?.name ?? '');
  const [categoryId, setCategoryId] = useState(group?.categoryId ?? '');
  const [baseTypeId, setBaseTypeId] = useState(group?.baseTypeId ?? '');
  const [roleAssignments, setRoleAssignments] = useState<Record<string, string>>(
    Object.fromEntries((group?.roleAssignments ?? []).map((a) => [a.roleId, a.typeId])),
  );
  const [conversionFactors, setConversionFactors] = useState<Record<string, string>>(
    Object.fromEntries(
      (group?.conversionFactors ?? []).map((f) => [f.typeId, String(Number(f.unitsPerBase))]),
    ),
  );
  const [pickingHierarchy, setPickingHierarchy] = useState(
    [...(group?.pickingHierarchy ?? [])].sort((a, b) => a.sortOrder - b.sortOrder).map((row) => row.typeId),
  );
  const [addHierarchyTypeId, setAddHierarchyTypeId] = useState('');
  const [historyTarget, setHistoryTarget] = useState<{ typeId: string; typeName: string } | null>(null);

  const [nameError, setNameError] = useState<string | null>(null);
  const [completenessErrors, setCompletenessErrors] = useState<string[]>([]);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Every non-Base Type currently reachable via a Role Assignment gets a Conversion Factor row
  // (`9-ui.md` §4 Group Detail/Edit — "one row per non-Base Type currently reachable via a Role
  // Assignment").
  const reachableNonBaseTypeIds = useMemo(() => {
    const ids = new Set(Object.values(roleAssignments));
    ids.delete(baseTypeId);
    return [...ids];
  }, [roleAssignments, baseTypeId]);

  const hierarchyRows = useMemo(
    () => pickingHierarchy.map((typeId) => ({ typeId, typeName: typeNameFrom(types, typeId) })),
    [pickingHierarchy, types],
  );

  const availableHierarchyTypes = types.filter((type) => !pickingHierarchy.includes(type.id));

  function handleReorderHierarchy(fromIndex: number, toIndex: number) {
    if (toIndex < 0 || toIndex >= pickingHierarchy.length) {return;}
    setPickingHierarchy((prev) => {
      const next = [...prev];
      const [moved] = next.splice(fromIndex, 1);
      next.splice(toIndex, 0, moved);
      return next;
    });
  }

  async function handleSave() {
    setNameError(null);
    setCompletenessErrors([]);
    setSaveError(null);

    const trimmedName = name.trim();
    if (!trimmedName) {
      setNameError('Name is required.');
      return;
    }
    if (!isLocked && !baseTypeId) {
      setCompletenessErrors(['Base Type is required (BR-002).']);
      return;
    }

    const input = {
      name: trimmedName,
      categoryId: categoryId || null,
      baseTypeId,
      roleAssignments: Object.entries(roleAssignments)
        .filter(([, typeId]) => typeId)
        .map(([roleId, typeId]) => ({ roleId, typeId })),
      conversionFactors: reachableNonBaseTypeIds.map((typeId) => ({
        typeId,
        unitsPerBase: Number(conversionFactors[typeId] ?? 0),
      })),
      pickingHierarchy: pickingHierarchy.map((typeId, index) => ({ typeId, sortOrder: index + 1 })),
    };

    setIsSubmitting(true);
    try {
      if (group) {
        await updateGroup(group.id, input);
        router.push(`/settings/uom/groups/${group.id}`);
      } else {
        const created = await createGroup(input);
        router.push(`/settings/uom/groups/${created.id}`);
      }
    } catch (error) {
      // BR-019's completeness rejection and BR-001's duplicate-name rejection both come back as
      // real server-side ConflictExceptions now — surfaced through the same banner rather than
      // re-implementing that validation client-side against mock data.
      setSaveError(errorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDelete() {
    if (!group) {return;}
    setDeleteError(null);
    try {
      await deleteGroup(group.id);
      router.push('/settings/uom/groups');
    } catch (error) {
      setDeleteError(errorMessage(error));
    }
  }

  return (
    <div className="flex flex-col gap-6 p-6">
      <div>
        <h1 className="font-display text-foreground text-2xl font-bold">Unit of Measure</h1>
        <p className="text-muted-foreground text-sm">Settings → System Configuration → Unit of Measure</p>
      </div>

      <UomSubNav />

      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-foreground text-lg font-semibold">{isEdit ? group!.name : 'Add Group'}</h2>
          <p className="text-muted-foreground text-sm">
            Base Type, Category, Role Assignments, Conversion Factors, and Picking Hierarchy, all in one save.
          </p>
        </div>
        {isEdit && (
          <div className="flex flex-col items-end gap-1">
            <Button
              type="button"
              variant="destructive"
              disabled={isLocked}
              title={isLocked ? 'This UOM Group is in use on one or more transactions and cannot be deleted.' : undefined}
              onClick={handleDelete}
            >
              Delete
            </Button>
            {deleteError && (
              <p role="alert" className="text-destructive text-xs">
                {deleteError}
              </p>
            )}
          </div>
        )}
      </div>

      {isLocked && (
        <div role="alert" className="border-warning/40 bg-warning/10 text-foreground flex items-start gap-3 rounded-lg border p-4 text-sm">
          <AlertTriangle className="text-warning mt-0.5 size-5 shrink-0" aria-hidden="true" />
          <p>
            This UOM Group is in use on one or more transactions and can no longer be edited, except
            its name. To use a different conversion, create a new Group instead.
          </p>
        </div>
      )}

      {refDataError && (
        <div role="alert" className="border-destructive/40 bg-destructive/10 text-destructive rounded-lg border p-4 text-sm">
          {refDataError}
        </div>
      )}

      {saveError && (
        <div role="alert" className="border-destructive/40 bg-destructive/10 text-destructive rounded-lg border p-4 text-sm">
          {saveError}
        </div>
      )}

      {completenessErrors.length > 0 && (
        <div role="alert" className="border-destructive/40 bg-destructive/10 text-destructive rounded-lg border p-4 text-sm">
          <p className="mb-1 font-semibold">Every role-assigned Type needs a Conversion Factor:</p>
          <ul className="list-inside list-disc">
            {completenessErrors.map((error) => (
              <li key={error}>{error}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Header */}
      <fieldset className="border-border bg-card grid grid-cols-1 gap-4 rounded-lg border p-6 sm:grid-cols-2">
        <legend className="text-foreground px-1 text-sm font-semibold">Header</legend>
        <FormField id="group-name" label="Name" required error={nameError ?? undefined}>
          <input
            id="group-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={isSubmitting}
            className="border-border bg-background w-full rounded-md border px-3 py-2 text-sm disabled:opacity-50"
          />
        </FormField>
        <FormField id="group-category" label="Category">
          <select
            id="group-category"
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            disabled={isLocked || isSubmitting}
            title={isLocked ? 'Locked because this Group is in use on one or more transactions.' : undefined}
            className="border-border bg-background w-full rounded-md border px-3 py-2 text-sm disabled:opacity-50"
          >
            <option value="">None</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </FormField>
        <FormField id="group-base-type" label="Base Type" required>
          <select
            id="group-base-type"
            value={baseTypeId}
            onChange={(e) => setBaseTypeId(e.target.value)}
            disabled={isLocked || isSubmitting}
            title={isLocked ? 'Locked because this Group is in use on one or more transactions.' : undefined}
            className="border-border bg-background w-full rounded-md border px-3 py-2 text-sm disabled:opacity-50"
          >
            <option value="" disabled>
              Select a Base Type…
            </option>
            {types.map((type) => (
              <option key={type.id} value={type.id}>
                {type.name}
              </option>
            ))}
          </select>
        </FormField>
        <div>
          <span className="text-foreground text-sm font-medium">Uses Picking Hierarchy</span>
          <p className="text-muted-foreground mt-1 text-sm">
            {pickingHierarchy.length > 0 ? 'Yes' : 'No'}{' '}
            <span className="text-xs">(computed — read-only, BR-013)</span>
          </p>
        </div>
      </fieldset>

      {/* Role Assignments */}
      <fieldset className="border-border bg-card rounded-lg border p-6">
        <legend className="text-foreground px-1 text-sm font-semibold">Role Assignments</legend>
        <div className="mt-2 flex flex-col gap-2">
          {roles.map((role) => {
            const assignedTypeId = roleAssignments[role.id] ?? '';
            const isDefaulted = !assignedTypeId;
            return (
              <div key={role.id} className="flex items-center justify-between gap-3 text-sm">
                <span className="text-foreground w-48 shrink-0 font-medium">{role.name}</span>
                <select
                  value={assignedTypeId}
                  onChange={(e) =>
                    setRoleAssignments((prev) => ({ ...prev, [role.id]: e.target.value }))
                  }
                  disabled={isLocked || isSubmitting}
                  aria-label={`Type for ${role.name} role`}
                  title={isLocked ? 'Locked because this Group is in use on one or more transactions.' : undefined}
                  className="border-border bg-background flex-1 rounded-md border px-2 py-1.5 text-sm disabled:opacity-50"
                >
                  <option value="">Unassigned</option>
                  {types.map((type) => (
                    <option key={type.id} value={type.id}>
                      {type.name}
                    </option>
                  ))}
                </select>
                {isDefaulted && baseTypeId && (
                  <span className="text-muted-foreground w-40 shrink-0 text-xs">
                    {typeNameFrom(types, baseTypeId)} <em>(default)</em>
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </fieldset>

      {/* Conversion Factors */}
      <fieldset className="border-border bg-card rounded-lg border p-6">
        <legend className="text-foreground px-1 text-sm font-semibold">Conversion Factors</legend>
        <p className="text-muted-foreground mb-3 text-sm">
          Whole-number units of the Base Type ({typeNameFrom(types, baseTypeId) || '—'}) per one unit shown.
        </p>
        {reachableNonBaseTypeIds.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            No non-Base Types assigned via a Role yet — assign one above to add a Conversion Factor here.
          </p>
        ) : (
          <div className="flex flex-col gap-2">
            {reachableNonBaseTypeIds.map((typeId) => {
              const value = conversionFactors[typeId] ?? '';
              const missing = value === '';
              return (
                <div key={typeId} className="flex items-center gap-3 text-sm">
                  <span className="text-foreground w-48 shrink-0 font-medium">{typeNameFrom(types, typeId)}</span>
                  <input
                    type="number"
                    inputMode="numeric"
                    step={1}
                    min={1}
                    value={value}
                    onChange={(e) =>
                      setConversionFactors((prev) => ({ ...prev, [typeId]: e.target.value.replace(/[^0-9]/g, '') }))
                    }
                    disabled={isLocked || isSubmitting}
                    title={isLocked ? 'Locked because this Group is in use on one or more transactions.' : undefined}
                    className="border-border bg-background w-28 rounded-md border px-2 py-1.5 text-sm disabled:opacity-50"
                    aria-label={`Units per base for ${typeNameFrom(types, typeId)}`}
                  />
                  {missing && (
                    <span className="text-destructive text-xs font-medium">Factor required (BR-019)</span>
                  )}
                  <button
                    type="button"
                    onClick={() => setHistoryTarget({ typeId, typeName: typeNameFrom(types, typeId) })}
                    className="text-primary ml-auto flex items-center gap-1 text-xs font-medium hover:underline"
                  >
                    <History className="size-3.5" aria-hidden="true" />
                    View History
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </fieldset>

      {/* Picking Hierarchy */}
      <fieldset className="border-border bg-card rounded-lg border p-6">
        <legend className="text-foreground px-1 text-sm font-semibold">Picking Hierarchy</legend>
        <p className="text-muted-foreground mb-3 text-sm">
          Ordered largest-to-smallest unit sequence used to break a pick quantity into whole units.
        </p>
        <PickingHierarchyList
          rows={hierarchyRows}
          disabled={isLocked || isSubmitting}
          onReorder={handleReorderHierarchy}
          onRemove={(typeId) => setPickingHierarchy((prev) => prev.filter((id) => id !== typeId))}
        />
        {!isLocked && availableHierarchyTypes.length > 0 && (
          <div className="mt-3 flex items-center gap-2">
            <select
              value={addHierarchyTypeId}
              onChange={(e) => setAddHierarchyTypeId(e.target.value)}
              className="border-border bg-background rounded-md border px-2 py-1.5 text-sm"
              aria-label="Type to add to Picking Hierarchy"
            >
              <option value="">Select a Type…</option>
              {availableHierarchyTypes.map((type) => (
                <option key={type.id} value={type.id}>
                  {type.name}
                </option>
              ))}
            </select>
            <Button
              type="button"
              size="sm"
              variant="secondary"
              disabled={!addHierarchyTypeId}
              onClick={() => {
                setPickingHierarchy((prev) => [...prev, addHierarchyTypeId]);
                setAddHierarchyTypeId('');
              }}
            >
              <Plus className="size-4" aria-hidden="true" />
              Add to Hierarchy
            </Button>
          </div>
        )}
      </fieldset>

      <div className="flex justify-end gap-3">
        <Button
          type="button"
          variant="secondary"
          disabled={isSubmitting}
          onClick={() => router.push(group ? `/settings/uom/groups/${group.id}` : '/settings/uom/groups')}
        >
          Cancel
        </Button>
        <Button type="button" disabled={isSubmitting} onClick={handleSave}>
          {isSubmitting ? 'Saving…' : 'Save'}
        </Button>
      </div>

      {historyTarget && group && (
        <ConversionFactorHistorySheet
          open={Boolean(historyTarget)}
          onOpenChange={(open) => !open && setHistoryTarget(null)}
          groupId={group.id}
          typeId={historyTarget.typeId}
          typeName={historyTarget.typeName}
        />
      )}
    </div>
  );
}
