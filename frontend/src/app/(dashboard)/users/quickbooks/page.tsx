import { Badge } from '@/components/ui/badge';
import { MOCK_QUICKBOOKS_SYNC, MOCK_USERS } from '@/lib/mock-data/users';

const STATUS_LABEL = { synced: 'Synced', pending: 'Pending', error: 'Error' } as const;
const STATUS_TONE = { synced: 'success', pending: 'warning', error: 'error' } as const;

// QuickBooks sync status (`docs-kit/5-modules/users/9-ui.md` §2) — per-user sync status for the
// revived employee-sync integration (ADR-074, not excluded as the legacy system had it).
export default function QuickBooksSyncStatusPage() {
  return (
    <div className="flex flex-col gap-6 p-6">
      <div>
        <h1 className="font-display text-foreground text-2xl font-bold">QuickBooks Sync Status</h1>
        <p className="text-muted-foreground text-sm">
          Per-user employee sync status — async via BullMQ (ADR-074), doesn&apos;t block a User save.
        </p>
      </div>

      <div className="border-border bg-card overflow-hidden rounded-lg border">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-border text-muted-foreground bg-accent/40 border-b">
              <th className="px-4 py-3 font-medium">User</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">QB List ID</th>
              <th className="px-4 py-3 font-medium">Last Synced</th>
              <th className="px-4 py-3 font-medium">Detail</th>
            </tr>
          </thead>
          <tbody>
            {MOCK_QUICKBOOKS_SYNC.map((sync) => {
              const user = MOCK_USERS.find((candidate) => candidate.id === sync.userId);
              if (!user) {return null;}
              return (
                <tr key={sync.userId} className="border-border border-b last:border-0">
                  <td className="text-foreground px-4 py-3 font-medium">
                    {user.firstName} {user.lastName}
                  </td>
                  <td className="px-4 py-3">
                    <Badge tone={STATUS_TONE[sync.status]}>{STATUS_LABEL[sync.status]}</Badge>
                  </td>
                  <td className="text-muted-foreground px-4 py-3">{sync.qbListId ?? '—'}</td>
                  <td className="text-muted-foreground px-4 py-3">
                    {sync.lastSyncedAt ? new Date(sync.lastSyncedAt).toLocaleString('en-US') : '—'}
                  </td>
                  <td className="text-muted-foreground px-4 py-3">{sync.errorMessage ?? '—'}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
