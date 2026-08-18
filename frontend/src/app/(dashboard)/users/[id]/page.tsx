import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { ResetPasswordButton } from '@/components/shared/users/ResetPasswordButton';
import { UserDetailDeleteButton } from '@/components/shared/users/UserDetailDeleteButton';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MOCK_GROUPS, MOCK_USERS, roleNameFor } from '@/lib/mock-data/users';

// User Detail (`docs-kit/5-modules/users/9-ui.md` §2 User Detail — "read-only header + audit
// trail"). Mock only — reads from the shared fixture (`lib/mock-data/users.ts`), same dataset the
// List and Edit pages use, so navigating List -> Detail -> Edit shows the same record throughout.
export default async function UserDetailPage({ params }: PageProps<'/users/[id]'>) {
  const { id } = await params;
  const user = MOCK_USERS.find((candidate) => candidate.id === id);

  if (!user) {
    notFound();
  }

  const groupNames = user.groupIds
    .map((groupId) => MOCK_GROUPS.find((group) => group.id === groupId)?.name)
    .filter(Boolean);

  return (
    <div className="flex flex-col gap-6 p-6">
      <div>
        <Link href="/users" className="text-muted-foreground hover:text-foreground mb-3 flex items-center gap-1 text-sm">
          <ArrowLeft className="size-4" aria-hidden="true" />
          Back to Users
        </Link>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="font-display text-foreground text-2xl font-bold">
              {user.firstName} {user.lastName}
            </h1>
            <p className="text-muted-foreground text-sm">@{user.username}</p>
          </div>
          <div className="flex items-center gap-2">
            <Badge tone={user.status === 'active' ? 'success' : 'default'}>
              {user.status === 'active' ? 'Active' : 'Inactive'}
            </Badge>
            <Button asChild size="sm">
              <Link href={`/users/${user.id}/edit`}>Edit</Link>
            </Button>
            <ResetPasswordButton user={user} />
            <UserDetailDeleteButton user={user} />
          </div>
        </div>
      </div>

      <dl className="border-border bg-card grid grid-cols-1 gap-x-8 gap-y-4 rounded-lg border p-6 sm:grid-cols-2">
        <Field label="Email" value={user.email} />
        <Field label="Phone" value={user.phone} />
        <Field label="Role" value={roleNameFor(user.roleId)} />
        <Field label="Default Location" value={user.defaultLocation} />
        <Field label="Groups" value={groupNames.length > 0 ? groupNames.join(', ') : '—'} />
        <Field label="Requires 2FA (via role)" value={user.requiresTwoFactor ? 'Yes' : 'No'} />
      </dl>

      <div className="border-border bg-card rounded-lg border p-6">
        <h2 className="text-foreground mb-4 text-sm font-semibold">Audit Trail</h2>
        <dl className="grid grid-cols-1 gap-x-8 gap-y-4 sm:grid-cols-2">
          <Field label="Created" value={`${new Date(user.createdAt).toLocaleString('en-US')} by ${user.createdBy}`} />
          <Field label="Last Updated" value={`${new Date(user.updatedAt).toLocaleString('en-US')} by ${user.updatedBy}`} />
        </dl>
      </div>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-muted-foreground text-xs font-medium tracking-wide uppercase">{label}</dt>
      <dd className="text-foreground mt-1 text-sm">{value}</dd>
    </div>
  );
}
