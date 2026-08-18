'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowLeft, Plus } from 'lucide-react';
import Link from 'next/link';
import { useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { RoleProfileGrid } from '@/components/shared/RoleProfileGrid';
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
import { addProfile, MOCK_PROFILES, removeProfile, setModulePermission, updateProfile } from '@/lib/mock-data/users';
import type { Profile } from '@/types/user';

// Profile administration (`docs-kit/5-modules/users/9-ui.md` §4 Profile / Group administration)
// — List + Create/Edit form (name/description) + `RoleProfileGrid` permission matrix. Delete via
// the shared `TransferTargetPicker` (BR-001).
const profileSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  description: z.string().min(1, 'Description is required'),
});

type ProfileFormValues = z.infer<typeof profileSchema>;

export default function ProfileAdministrationPage() {
  const [profiles, setProfiles] = useState(MOCK_PROFILES);
  const [editing, setEditing] = useState<Profile | 'new' | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Profile | null>(null);

  function refresh() {
    setProfiles([...MOCK_PROFILES]);
  }

  const deleteCandidates = useMemo(
    () =>
      profiles
        .filter((profile) => profile.id !== deleteTarget?.id)
        .map((profile) => ({ id: profile.id, label: profile.name })),
    [profiles, deleteTarget],
  );

  return (
    <div className="flex flex-col gap-6 p-6">
      <Link href="/users/roles" className="text-muted-foreground hover:text-foreground flex items-center gap-1 text-sm">
        <ArrowLeft className="size-4" aria-hidden="true" />
        Back to Roles
      </Link>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-foreground text-2xl font-bold">Profiles</h1>
          <p className="text-muted-foreground text-sm">
            Permission bundles assigned to Roles — module/field/action access.
          </p>
        </div>
        <Button onClick={() => setEditing('new')}>
          <Plus className="size-4" aria-hidden="true" />
          Create Profile
        </Button>
      </div>

      <div className="flex flex-col gap-6">
        {profiles.map((profile) => (
          <div key={profile.id} className="border-border bg-card rounded-lg border p-4">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2 className="text-foreground text-sm font-semibold">{profile.name}</h2>
                <p className="text-muted-foreground text-xs">{profile.description}</p>
              </div>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setEditing(profile)}
                  className="text-primary text-sm font-medium hover:underline"
                >
                  Edit
                </button>
                <button
                  type="button"
                  onClick={() => setDeleteTarget(profile)}
                  className="text-destructive text-sm font-medium hover:underline"
                >
                  Delete
                </button>
              </div>
            </div>
            <RoleProfileGrid
              profile={profile}
              onChange={(moduleKey, permission) => {
                setModulePermission(profile.id, moduleKey, permission);
                refresh();
              }}
            />
          </div>
        ))}
      </div>

      {editing && (
        <ProfileFormDialog
          profile={editing === 'new' ? null : editing}
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
          entityLabel="profile"
          itemName={deleteTarget.name}
          candidates={deleteCandidates}
          onConfirm={(transferTargetId) => {
            removeProfile(deleteTarget.id, transferTargetId);
            refresh();
          }}
        />
      )}
    </div>
  );
}

function ProfileFormDialog({
  profile,
  onClose,
  onSaved,
}: {
  profile: Profile | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const isEdit = Boolean(profile);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: profile
      ? { name: profile.name, description: profile.description }
      : { name: '', description: '' },
  });

  async function onSubmit(values: ProfileFormValues) {
    await new Promise((resolve) => setTimeout(resolve, 200));
    if (profile) {
      updateProfile(profile.id, values);
    } else {
      // New Profile's permission baseline copies from the named default-profile template
      // (`5-data-dictionary.md` §6) — see `addProfile`.
      addProfile(values);
    }
    onSaved();
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? `Edit ${profile?.name}` : 'Create Profile'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-4">
          <FormField id="profile-name" label="Name" required error={errors.name?.message}>
            <input
              id="profile-name"
              disabled={isSubmitting}
              className="border-border bg-background w-full rounded-md border px-3 py-2 text-sm disabled:opacity-50"
              {...register('name')}
            />
          </FormField>
          <FormField id="profile-description" label="Description" required error={errors.description?.message}>
            <input
              id="profile-description"
              disabled={isSubmitting}
              className="border-border bg-background w-full rounded-md border px-3 py-2 text-sm disabled:opacity-50"
              {...register('description')}
            />
          </FormField>
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
