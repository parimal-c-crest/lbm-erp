import { UserForm } from '@/components/shared/users/UserForm';

// User Create (`docs-kit/5-modules/users/9-ui.md` §4 User Create/Edit) — blank form, not
// pre-filled with fake data (Module Design-First Strategy's List/Detail-vs-Create distinction).
export default function NewUserPage() {
  return (
    <div className="flex flex-col gap-6 p-6">
      <div>
        <h1 className="font-display text-foreground text-2xl font-bold">Create User</h1>
        <p className="text-muted-foreground text-sm">Add a new user and assign their role.</p>
      </div>
      <UserForm />
    </div>
  );
}
