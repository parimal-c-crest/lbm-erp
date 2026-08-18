'use client';

import { ArrowDown, ArrowUp, ArrowUpDown, Plus } from 'lucide-react';
import Link from 'next/link';
import { useMemo, useState } from 'react';

import { RowAction, RowActions } from '@/components/shared/RowActions';
import { TransferTargetPicker } from '@/components/shared/TransferTargetPicker';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MOCK_LOCATIONS, MOCK_ROLES, MOCK_USERS, removeMockUser, roleNameFor } from '@/lib/mock-data/users';
import type { User } from '@/types/user';

// User List (`docs-kit/5-modules/users/9-ui.md` §4 User List) — Admin-only in the real system
// (`7-permissions.md` §9); no auth gate exists yet at this mock-data stage (EPIC-005 wires that).
const PAGE_SIZE = 10;

type SortKey = 'name' | 'email' | 'role' | 'status' | 'defaultLocation';

export default function UsersListPage() {
  // Local copy of the shared fixture so a delete (T-030) re-renders this list immediately;
  // `removeMockUser` also mutates the underlying fixture so other pages stay consistent after
  // this one unmounts (mock-only — EPIC-005 replaces this with a real list re-fetch).
  const [users, setUsers] = useState(MOCK_USERS);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [locationFilter, setLocationFilter] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('name');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [page, setPage] = useState(1);
  const [deleteTarget, setDeleteTarget] = useState<User | null>(null);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return users.filter((user) => {
      const fullName = `${user.firstName} ${user.lastName}`.toLowerCase();
      const matchesSearch =
        query === '' || fullName.includes(query) || user.email.toLowerCase().includes(query) || user.username.toLowerCase().includes(query);
      const matchesRole = roleFilter === '' || user.roleId === roleFilter;
      const matchesLocation = locationFilter === '' || user.defaultLocation === locationFilter;
      return matchesSearch && matchesRole && matchesLocation;
    });
  }, [users, search, roleFilter, locationFilter]);

  const sorted = useMemo(() => {
    const withKeys = filtered.map((user) => ({
      user,
      name: `${user.firstName} ${user.lastName}`,
      role: roleNameFor(user.roleId),
    }));
    withKeys.sort((a, b) => {
      const aValue = sortKey === 'name' ? a.name : sortKey === 'role' ? a.role : sortKey === 'email' ? a.user.email : sortKey === 'status' ? a.user.status : a.user.defaultLocation;
      const bValue = sortKey === 'name' ? b.name : sortKey === 'role' ? b.role : sortKey === 'email' ? b.user.email : sortKey === 'status' ? b.user.status : b.user.defaultLocation;
      const cmp = aValue.localeCompare(bValue);
      return sortDir === 'asc' ? cmp : -cmp;
    });
    return withKeys.map((entry) => entry.user);
  }, [filtered, sortKey, sortDir]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pageItems = sorted.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const transferCandidates = useMemo(
    () =>
      users
        .filter((user) => user.id !== deleteTarget?.id)
        .map((user) => ({ id: user.id, label: `${user.firstName} ${user.lastName} (@${user.username})` })),
    [users, deleteTarget],
  );

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
    setPage(1);
  }

  function handleDeleteConfirmed() {
    if (!deleteTarget) {return;}
    // Mock only — real reassignment of owned/assigned records to the chosen transfer target
    // happens server-side once EPIC-005's real DELETE /users/{id} exists (BR-001).
    removeMockUser(deleteTarget.id);
    setUsers((prev) => prev.filter((candidate) => candidate.id !== deleteTarget.id));
  }

  function SortIcon({ column }: { column: SortKey }) {
    if (sortKey !== column) {
      return <ArrowUpDown className="size-3.5" aria-hidden="true" />;
    }
    return sortDir === 'asc' ? <ArrowUp className="size-3.5" aria-hidden="true" /> : <ArrowDown className="size-3.5" aria-hidden="true" />;
  }

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-foreground text-2xl font-bold">Users</h1>
          <p className="text-muted-foreground text-sm">
            Manage users, roles, and access across your organization.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="secondary">
            <Link href="/users/roles">Roles &amp; Permissions</Link>
          </Button>
          <Button asChild variant="secondary">
            <Link href="/users/timeclock/override">Time-Card Override</Link>
          </Button>
          <Button asChild variant="secondary">
            <Link href="/users/personal-days">Personal Days</Link>
          </Button>
          <Button asChild variant="secondary">
            <Link href="/users/payroll">Payroll Report</Link>
          </Button>
          <Button asChild variant="secondary">
            <Link href="/users/quickbooks">QuickBooks Sync</Link>
          </Button>
          <Button asChild variant="secondary">
            <Link href="/users/import">CSV Import</Link>
          </Button>
          <Button asChild variant="secondary">
            <Link href="/users/mass-update">Mass Update</Link>
          </Button>
          <Button asChild variant="secondary">
            <Link href="/users/barcode-labels">Barcode Labels</Link>
          </Button>
          <Button asChild>
            <Link href="/users/new">
              <Plus className="size-4" aria-hidden="true" />
              Create User
            </Link>
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <input
          type="search"
          placeholder="Search by name, email, or username…"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          className="border-border bg-background w-full max-w-xs rounded-md border px-3 py-2 text-sm"
          aria-label="Search users"
        />
        <select
          value={roleFilter}
          onChange={(e) => {
            setRoleFilter(e.target.value);
            setPage(1);
          }}
          className="border-border bg-background rounded-md border px-3 py-2 text-sm"
          aria-label="Filter by role"
        >
          <option value="">All Roles</option>
          {MOCK_ROLES.map((role) => (
            <option key={role.id} value={role.id}>
              {role.name}
            </option>
          ))}
        </select>
        <select
          value={locationFilter}
          onChange={(e) => {
            setLocationFilter(e.target.value);
            setPage(1);
          }}
          className="border-border bg-background rounded-md border px-3 py-2 text-sm"
          aria-label="Filter by default location"
        >
          <option value="">All Locations</option>
          {MOCK_LOCATIONS.map((location) => (
            <option key={location} value={location}>
              {location}
            </option>
          ))}
        </select>
      </div>

      <div className="border-border bg-card overflow-hidden rounded-lg border">
        {sorted.length === 0 ? (
          <div className="flex flex-col items-center gap-3 p-12 text-center">
            <p className="text-foreground font-medium">No users yet — create your first one</p>
            <Button asChild size="sm">
              <Link href="/users/new">Create User</Link>
            </Button>
          </div>
        ) : (
          <>
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-border text-muted-foreground bg-accent/40 border-b">
                  {(
                    [
                      ['name', 'Name'],
                      ['email', 'Email'],
                      ['role', 'Role'],
                      ['status', 'Status'],
                      ['defaultLocation', 'Default Location'],
                    ] as [SortKey, string][]
                  ).map(([key, label]) => (
                    <th key={key} className="px-4 py-3 font-medium">
                      <button
                        type="button"
                        onClick={() => toggleSort(key)}
                        className="hover:text-foreground flex items-center gap-1"
                      >
                        {label}
                        <SortIcon column={key} />
                      </button>
                    </th>
                  ))}
                  <th className="px-4 py-3 font-medium">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {pageItems.map((user) => (
                  <UserRow key={user.id} user={user} onDeleteRequested={() => setDeleteTarget(user)} />
                ))}
              </tbody>
            </table>

            <div className="border-border text-muted-foreground flex items-center justify-between border-t px-4 py-3 text-sm">
              <span>
                Showing {(currentPage - 1) * PAGE_SIZE + 1}–{Math.min(currentPage * PAGE_SIZE, sorted.length)} of {sorted.length}
              </span>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  disabled={currentPage <= 1}
                  onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                >
                  Previous
                </Button>
                <span>
                  Page {currentPage} of {totalPages}
                </span>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  disabled={currentPage >= totalPages}
                  onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
                >
                  Next
                </Button>
              </div>
            </div>
          </>
        )}
      </div>

      {deleteTarget && (
        <TransferTargetPicker
          open={Boolean(deleteTarget)}
          onOpenChange={(open) => {
            if (!open) {setDeleteTarget(null);}
          }}
          entityLabel="user"
          itemName={`${deleteTarget.firstName} ${deleteTarget.lastName}`}
          candidates={transferCandidates}
          onConfirm={handleDeleteConfirmed}
        />
      )}
    </div>
  );
}

function UserRow({ user, onDeleteRequested }: { user: User; onDeleteRequested: () => void }) {
  return (
    <tr className="border-border hover:bg-accent/30 border-b last:border-0">
      <td className="px-4 py-3">
        <Link href={`/users/${user.id}`} className="text-foreground font-medium hover:underline">
          {user.firstName} {user.lastName}
        </Link>
      </td>
      <td className="text-muted-foreground px-4 py-3">{user.email}</td>
      <td className="px-4 py-3">{roleNameFor(user.roleId)}</td>
      <td className="px-4 py-3">
        <Badge tone={user.status === 'active' ? 'success' : 'default'}>
          {user.status === 'active' ? 'Active' : 'Inactive'}
        </Badge>
      </td>
      <td className="text-muted-foreground px-4 py-3">{user.defaultLocation}</td>
      <td className="px-4 py-3 text-right">
        <RowActions>
          <RowAction.Edit href={`/users/${user.id}/edit`} />
          <RowAction.Delete onClick={onDeleteRequested} />
        </RowActions>
      </td>
    </tr>
  );
}
