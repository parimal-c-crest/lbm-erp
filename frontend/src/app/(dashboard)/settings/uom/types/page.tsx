'use client';

import { useCallback, useEffect, useState } from 'react';

import { UomReferenceListPage } from '@/components/shared/UomReferenceListPage';
import { categoryNameFrom, createType, deleteType, errorMessage, listCategories, listTypes, updateType } from '@/lib/api/uom';
import type { UOMCategory, UOMType } from '@/types/uom';

// Type List/Edit (`docs-kit/5-modules/uom/9-ui.md` §4 Type List/Edit) — same pattern as Category,
// plus an optional Category picker dropdown (ADR-192). `UOMType.category_id` is optional, so
// leaving it unselected is a valid save, not a validation error. Wired to the real backend
// (EPIC-011, T-074).
export default function UomTypesPage() {
  const [items, setItems] = useState<UOMType[]>([]);
  const [categories, setCategories] = useState<UOMCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const [typesPage, categoriesPage] = await Promise.all([listTypes(), listCategories()]);
      setItems(typesPage.items);
      setCategories(categoriesPage.items);
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
      title="Types"
      description="Manage individual UOM Types (Each, Foot, Board Foot, Case, Pallet, …)."
      addLabel="Add Type"
      emptyStateMessage="No Types yet — add one to start building UOM Groups."
      items={items}
      loading={loading}
      loadError={loadError}
      onAdd={async (input) => {
        await createType({ name: input.name, categoryId: input.categoryId, sortOrder: input.sortOrder });
      }}
      onUpdate={async (id, input) => {
        await updateType(id, { name: input.name, categoryId: input.categoryId, sortOrder: input.sortOrder });
      }}
      onDelete={async (id) => {
        try {
          await deleteType(id);
          return { ok: true };
        } catch (error) {
          return { ok: false, error: errorMessage(error) };
        }
      }}
      onRefresh={refresh}
      categoryOptions={categories.map((category) => ({ id: category.id, name: category.name }))}
      categoryIdFor={(type) => type.categoryId}
      categoryLabelFor={(type) => categoryNameFrom(categories, type.categoryId)}
    />
  );
}
