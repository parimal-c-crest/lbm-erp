'use client';

import { useCallback, useEffect, useState } from 'react';

import { UomReferenceListPage } from '@/components/shared/UomReferenceListPage';
import { createFunctionalRole, deleteFunctionalRole, errorMessage, listFunctionalRoles, updateFunctionalRole } from '@/lib/api/uom';
import type { UOMFunctionalRole } from '@/types/uom';

// Functional Role List/Edit (`docs-kit/5-modules/uom/9-ui.md` §4 Functional Role List/Edit) —
// same pattern as Category, pre-populated with the 11 seeded starter roles (`5-data-dictionary.md`
// §5, migration-seeded per T-073). Seeded rows remain fully rename/delete-able like any other row
// (ADR-094); delete-in-use guard confirmed by ADR-192/BR-014. Wired to the real backend
// (EPIC-011, T-074).
export default function UomFunctionalRolesPage() {
  const [items, setItems] = useState<UOMFunctionalRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const { items: fetched } = await listFunctionalRoles();
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
      title="Functional Roles"
      description="Manage UOM Functional Roles (Selling, Pricing, Stocking, Picking, …)."
      addLabel="Add Functional Role"
      emptyStateMessage="No Functional Roles yet — add one to start assigning Group roles."
      items={items}
      loading={loading}
      loadError={loadError}
      onAdd={async (input) => {
        await createFunctionalRole({ name: input.name, sortOrder: input.sortOrder });
      }}
      onUpdate={async (id, input) => {
        await updateFunctionalRole(id, { name: input.name, sortOrder: input.sortOrder });
      }}
      onDelete={async (id) => {
        try {
          await deleteFunctionalRole(id);
          return { ok: true };
        } catch (error) {
          return { ok: false, error: errorMessage(error) };
        }
      }}
      onRefresh={refresh}
    />
  );
}
