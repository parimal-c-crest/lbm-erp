import { notFound } from 'next/navigation';

import { UserForm } from '@/components/shared/users/UserForm';
import { MOCK_USERS } from '@/lib/mock-data/users';

// User Edit (`docs-kit/5-modules/users/9-ui.md` §4 User Create/Edit) — pre-filled from the shared
// fixture, same record the List/Detail pages read.
export default async function EditUserPage({ params }: PageProps<'/users/[id]/edit'>) {
  const { id } = await params;
  const user = MOCK_USERS.find((candidate) => candidate.id === id);

  if (!user) {
    notFound();
  }

  return (
    <div className="flex flex-col gap-6 p-6">
      <div>
        <h1 className="font-display text-foreground text-2xl font-bold">
          Edit {user.firstName} {user.lastName}
        </h1>
        <p className="text-muted-foreground text-sm">Update this user&apos;s details, role, and access.</p>
      </div>
      <UserForm user={user} />
    </div>
  );
}
