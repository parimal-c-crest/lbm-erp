'use client';

import { useCallback, useEffect, useState } from 'react';

import { UomReferenceListPage } from '@/components/shared/UomReferenceListPage';
import { createCategory, deleteCategory, errorMessage, listCategories, updateCategory } from '@/lib/api/uom';
import type { UOMCategory } from '@/types/uom';

// Category List/Edit (`docs-kit/5-modules/uom/9-ui.md` §4 Category List/Edit) — DataTable +
// Add/Edit Dialog (Name, Sort Order), soft-delete with BR-014 in-use-guard error surfacing.
// Wired to the real backend (EPIC-011, T-074) — no longer reads `lib/mock-data/uom.ts`.
export default function UomCategoriesPage() {
  const [items, setItems] = useState<UOMCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const { items: fetched } = await listCategories();
      setItems(fetched);
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

  return (
    <UomReferenceListPage
      title="Categories"
      description="Manage UOM Categories (Length, Volume, Weight, Each, …)."
      addLabel="Add Category"
      emptyStateMessage="No Categories yet — add one to start organizing UOM Groups."
      items={items}
      loading={loading}
      loadError={loadError}
      onAdd={async (input) => {
        await createCategory({ name: input.name, sortOrder: input.sortOrder });
      }}
      onUpdate={async (id, input) => {
        await updateCategory(id, { name: input.name, sortOrder: input.sortOrder });
      }}
      onDelete={async (id) => {
        try {
          await deleteCategory(id);
          return { ok: true };
        } catch (error) {
          return { ok: false, error: errorMessage(error) };
        }
      }}
      onRefresh={refresh}
    />
  );
}
