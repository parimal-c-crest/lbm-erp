'use client';

import { Plus, Upload } from 'lucide-react';
import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { RowAction, RowActions } from '@/components/shared/RowActions';
import { UomImportExportDialog } from '@/components/shared/UomImportExportDialog';
import { UomSubNav } from '@/components/shared/UomSubNav';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { categoryNameFrom, deleteGroup, errorMessage, listCategories, listGroups, listTypes, typeNameFrom } from '@/lib/api/uom';
import type { UOMCategory, UOMGroupSummary, UOMType } from '@/types/uom';

type GroupRow = UOMGroupSummary;

// Group List (`docs-kit/5-modules/uom/9-ui.md` §4 Group List) — Name/Category/Base Type/computed
// "Uses Picking Hierarchy" badge/Role-count columns, Category filter, Add/Open/Delete actions.
// Wired to the real backend (EPIC-011, T-075) — no longer reads `lib/mock-data/uom.ts`.
export default function UomGroupsPage() {
  const [groups, setGroups] = useState<GroupRow[]>([]);
  const [categories, setCategories] = useState<UOMCategory[]>([]);
  const [types, setTypes] = useState<UOMType[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [deleteError, setDeleteError] = useState<{ id: string; message: string } | null>(null);
  const [importExportOpen, setImportExportOpen] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const [groupsPage, categoriesPage, typesPage] = await Promise.all([
        listGroups(),
        listCategories(),
        listTypes(),
      ]);
      setGroups(groupsPage.items);
      setCategories(categoriesPage.items);
      setTypes(typesPage.items);
    } catch (error) {
      setLoadError(errorMessage(error));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial data fetch on mount
    void refresh();
  }, [refresh]);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return groups
      .filter((group) => query === '' || group.name.toLowerCase().includes(query))
      .filter((group) => categoryFilter === '' || group.categoryId === categoryFilter)
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [groups, search, categoryFilter]);

  async function handleDelete(group: GroupRow) {
    setDeleteError(null);
    try {
      await deleteGroup(group.id);
      await refresh();
    } catch (error) {
      setDeleteError({ id: group.id, message: errorMessage(error) });
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
          <h2 className="text-foreground text-lg font-semibold">Groups</h2>
          <p className="text-muted-foreground text-sm">
            Product-assignable bundles of Base Type, Role Assignments, Conversion Factors, and Picking Hierarchy.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => setImportExportOpen(true)}>
            <Upload className="size-4" aria-hidden="true" />
            Import / Export
          </Button>
          <Button asChild>
            <Link href="/settings/uom/groups/new">
              <Plus className="size-4" aria-hidden="true" />
              Add Group
            </Link>
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <input
          type="search"
          placeholder="Search by name…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="border-border bg-background w-full max-w-xs rounded-md border px-3 py-2 text-sm"
          aria-label="Search groups"
        />
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="border-border bg-background rounded-md border px-3 py-2 text-sm"
          aria-label="Filter by category"
        >
          <option value="">All Categories</option>
          {categories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </select>
      </div>

      {loadError && (
        <div role="alert" className="border-destructive/40 bg-destructive/10 text-destructive rounded-lg border p-4 text-sm">
          {loadError}
        </div>
      )}

      <div className="border-border bg-card overflow-hidden rounded-lg border">
        {loading ? (
          <div className="text-muted-foreground p-12 text-center text-sm">Loading…</div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center gap-3 p-12 text-center">
            <p className="text-foreground font-medium">No UOM Groups yet — add one to start assigning units to products.</p>
            <Button asChild size="sm">
              <Link href="/settings/uom/groups/new">Add Group</Link>
            </Button>
          </div>
        ) : (
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-border text-muted-foreground bg-accent/40 border-b">
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">Category</th>
                <th className="px-4 py-3 font-medium">Base Type</th>
                <th className="px-4 py-3 font-medium">Uses Picking Hierarchy</th>
                <th className="px-4 py-3 font-medium">UOM Roles</th>
                <th className="px-4 py-3 font-medium">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((group) => (
                <tr key={group.id} className="border-border hover:bg-accent/30 border-b last:border-0 align-top">
                  <td className="px-4 py-3">
                    <Link href={`/settings/uom/groups/${group.id}`} className="text-foreground font-medium hover:underline">
                      {group.name}
                    </Link>
                  </td>
                  <td className="text-muted-foreground px-4 py-3">{categoryNameFrom(categories, group.categoryId)}</td>
                  <td className="text-muted-foreground px-4 py-3">{typeNameFrom(types, group.baseTypeId)}</td>
                  <td className="px-4 py-3">
                    <Badge tone={group.usesPickingHierarchy ? 'success' : 'default'}>
                      {group.usesPickingHierarchy ? 'Yes' : 'No'}
                    </Badge>
                  </td>
                  <td className="text-muted-foreground px-4 py-3">{group.roleAssignmentCount} role(s) assigned</td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex flex-col items-end gap-1">
                      <RowActions>
                        <RowAction.Open href={`/settings/uom/groups/${group.id}`} />
                        <RowAction.Delete onClick={() => handleDelete(group)} />
                      </RowActions>
                      {deleteError?.id === group.id && (
                        <p role="alert" className="text-destructive max-w-xs text-right text-xs">
                          {deleteError.message}
                        </p>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <UomImportExportDialog open={importExportOpen} onOpenChange={setImportExportOpen} onImported={refresh} />
    </div>
  );
}
