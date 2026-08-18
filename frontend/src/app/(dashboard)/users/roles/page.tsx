'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { Plus } from 'lucide-react';
import Link from 'next/link';
import { useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';


import { RoleTree } from '@/components/shared/RoleTree';
import { TransferTargetPicker } from '@/components/shared/TransferTargetPicker';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { FormField } from '@/components/ui/form-field';
import { addRole, MOCK_ROLES, removeRole, reparentRole, setRoleTwoFactorRequired, updateRole } from '@/lib/mock-data/users';
import type { Role } from '@/types/user';

// Role administration (`docs-kit/5-modules/users/9-ui.md` §4 Role administration) — hierarchy
// tree picker, drag-and-drop reparenting (`RoleTree`), Create/Edit form, per-role 2FA toggle
// (ADR-075), delete via the shared `TransferTargetPicker` (BR-001). One integrated screen per the
// Screen Inventory's single "Role administration" row, not separate List/Create/Edit routes.
const roleSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  description: z.string().min(1, 'Description is required'),
  parentRoleId: z.string(),
});

type RoleFormValues = z.infer<typeof roleSchema>;

export default function RoleAdministrationPage() {
  const [roles, setRoles] = useState(MOCK_ROLES);
  const [editing, setEditing] = useState<Role | 'new' | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Role | null>(null);

  function refresh() {
    setRoles([...MOCK_ROLES]);
  }

  const deleteCandidates = useMemo(
    () =>
      roles
        .filter((role) => role.id !== deleteTarget?.id)
        .map((role) => ({ id: role.id, label: role.name })),
    [roles, deleteTarget],
  );

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-foreground text-2xl font-bold">Roles</h1>
          <p className="text-muted-foreground text-sm">
            Manage the role hierarchy and per-role 2FA requirement.
          </p>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="secondary">
            <Link href="/users/profiles">Profiles</Link>
          </Button>
          <Button asChild variant="secondary">
            <Link href="/users/groups">Groups</Link>
          </Button>
          <Button onClick={() => setEditing('new')}>
            <Plus className="size-4" aria-hidden="true" />
            Create Role
          </Button>
        </div>
      </div>

      <RoleTree
        roles={roles}
        onReparent={(roleId, newParentId) => {
          reparentRole(roleId, newParentId);
          refresh();
        }}
        onEdit={(role) => setEditing(role)}
        onDelete={(role) => setDeleteTarget(role)}
        onToggleTwoFactor={(role, required) => {
          setRoleTwoFactorRequired(role.id, required);
          refresh();
        }}
      />

      {editing && (
        <RoleFormDialog
          role={editing === 'new' ? null : editing}
          roles={roles}
          onClose={() => setEditing(null)}
          onSaved={() => {
            refresh();
            setEditing(null);
          }}
        />
      )}

      {deleteTarget && (
        <TransferTargetPicker
          open={Boolean(deleteTarget)}
          onOpenChange={(open) => {
            if (!open) {setDeleteTarget(null);}
          }}
          entityLabel="role"
          itemName={deleteTarget.name}
          candidates={deleteCandidates}
          onConfirm={(transferTargetId) => {
            removeRole(deleteTarget.id, transferTargetId);
            refresh();
          }}
        />
      )}
    </div>
  );
}

function RoleFormDialog({
  role,
  roles,
  onClose,
  onSaved,
}: {
  role: Role | null;
  roles: Role[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const isEdit = Boolean(role);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RoleFormValues>({
    resolver: zodResolver(roleSchema),
    defaultValues: role
      ? { name: role.name, description: role.description, parentRoleId: role.parentRoleId ?? '' }
      : { name: '', description: '', parentRoleId: '' },
  });

  async function onSubmit(values: RoleFormValues) {
    await new Promise((resolve) => setTimeout(resolve, 200));
    if (role) {
      updateRole(role.id, { name: values.name, description: values.description });
    } else {
      addRole({ name: values.name, description: values.description, parentRoleId: values.parentRoleId || null });
    }
    onSaved();
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? `Edit ${role?.name}` : 'Create Role'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-4">
          <FormField id="role-name" label="Name" required error={errors.name?.message}>
            <input
              id="role-name"
              disabled={isSubmitting}
              className="border-border bg-background w-full rounded-md border px-3 py-2 text-sm disabled:opacity-50"
              {...register('name')}
            />
          </FormField>
          <FormField id="role-description" label="Description" required error={errors.description?.message}>
            <input
              id="role-description"
              disabled={isSubmitting}
              className="border-border bg-background w-full rounded-md border px-3 py-2 text-sm disabled:opacity-50"
              {...register('description')}
            />
          </FormField>
          {!isEdit && (
            <FormField id="role-parent" label="Parent Role">
              <select
                id="role-parent"
                disabled={isSubmitting}
                className="border-border bg-background w-full rounded-md border px-3 py-2 text-sm disabled:opacity-50"
                {...register('parentRoleId')}
              >
                <option value="">None (top level)</option>
                {roles.map((candidate) => (
                  <option key={candidate.id} value={candidate.id}>
                    {candidate.name}
                  </option>
                ))}
              </select>
            </FormField>
          )}
          <DialogFooter>
            <Button type="button" variant="secondary" disabled={isSubmitting} onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Saving…' : 'Save'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
