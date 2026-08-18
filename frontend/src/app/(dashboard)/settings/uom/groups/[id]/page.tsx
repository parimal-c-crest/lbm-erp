'use client';

import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';

import { UomGroupForm } from '@/components/shared/UomGroupForm';
import { errorMessage, getGroup } from '@/lib/api/uom';
import type { UOMGroup } from '@/types/uom';

// Group Detail/Edit (`docs-kit/5-modules/uom/9-ui.md` §4) — fetches the real Group from the
// backend (EPIC-011, T-075) instead of reading the shared mock fixture.
export default function UomGroupDetailPage() {
  const params = useParams<{ id: string }>();
  const [group, setGroup] = useState<UOMGroup | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- refetch when the route's :id changes
    setLoading(true);
    getGroup(params.id)
      .then((fetched) => {
        if (!cancelled) {setGroup(fetched);}
      })
      .catch((error: unknown) => {
        if (!cancelled) {setLoadError(errorMessage(error));}
      })
      .finally(() => {
        if (!cancelled) {setLoading(false);}
      });
    return () => {
      cancelled = true;
    };
  }, [params.id]);

  if (loading) {
    return <div className="text-muted-foreground p-12 text-center text-sm">Loading…</div>;
  }
  if (loadError || !group) {
    return (
      <div role="alert" className="text-destructive p-12 text-center text-sm">
        {loadError ?? 'Group not found.'}
      </div>
    );
  }

  return <UomGroupForm group={group} />;
}
