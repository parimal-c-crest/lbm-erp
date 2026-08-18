'use client';

import { ArrowLeft, Plus } from 'lucide-react';
import Link from 'next/link';
import { useMemo, useState } from 'react';

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
import { addGroup, MOCK_GROUPS, MOCK_ROLES, MOCK_USERS, removeGroup, updateGroup } from '@/lib/mock-data/users';
import type { Group, GroupMember, GroupMemberType } from '@/types/user';

// Group administration (`docs-kit/5-modules/users/9-ui.md` §4 Group administration) — List +
// Create/Edit form with a member picker (Users / Roles / Roles-and-Subordinates), Delete via the
// shared `TransferTargetPicker` (same pattern as Role, per §4). Group is an assignment/roster
// target only, no sharing-rule/visibility meaning (ADR-081).
export default function GroupAdministrationPage() {
  const [groups, setGroups] = useState(MOCK_GROUPS);
  const [editing, setEditing] = useState<Group | 'new' | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Group | null>(null);

  function refresh() {
    setGroups([...MOCK_GROUPS]);
  }

  const deleteCandidates = useMemo(
    () =>
      groups
        .filter((group) => group.id !== deleteTarget?.id)
        .map((group) => ({ id: group.id, label: group.name })),
    [groups, deleteTarget],
  );

  return (
    <div className="flex flex-col gap-6 p-6">
      <Link href="/users/roles" className="text-muted-foreground hover:text-foreground flex items-center gap-1 text-sm">
        <ArrowLeft className="size-4" aria-hidden="true" />
        Back to Roles
      </Link>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-foreground text-2xl font-bold">Groups</h1>
          <p className="text-muted-foreground text-sm">
            Named assignment/roster targets (e.g. bulk notification recipients) — not a record-
            visibility mechanism.
          </p>
        </div>
        <Button onClick={() => setEditing('new')}>
          <Plus className="size-4" aria-hidden="true" />
          Create Group
        </Button>
      </div>

      <div className="border-border bg-card overflow-hidden rounded-lg border">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-border text-muted-foreground bg-accent/40 border-b">
              <th className="px-4 py-3 font-medium">Name</th>
              <th className="px-4 py-3 font-medium">Description</th>
              <th className="px-4 py-3 font-medium">Members</th>
              <th className="px-4 py-3 font-medium">
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {groups.map((group) => (
              <tr key={group.id} className="border-border border-b last:border-0">
                <td className="text-foreground px-4 py-3 font-medium">{group.name}</td>
                <td className="text-muted-foreground px-4 py-3">{group.description}</td>
                <td className="text-muted-foreground px-4 py-3">
                  {group.members.map((member) => member.label).join(', ') || '—'}
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="flex justify-end gap-3">
                    <button
                      type="button"
                      onClick={() => setEditing(group)}
                      className="text-primary text-sm font-medium hover:underline"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeleteTarget(group)}
                      className="text-destructive text-sm font-medium hover:underline"
                    >
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {editing && (
        <GroupFormDialog
          group={editing === 'new' ? null : editing}
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
          entityLabel="group"
          itemName={deleteTarget.name}
          candidates={deleteCandidates}
          onConfirm={(transferTargetId) => {
            removeGroup(deleteTarget.id, transferTargetId);
            refresh();
          }}
        />
      )}
    </div>
  );
}

function GroupFormDialog({
  group,
  onClose,
  onSaved,
}: {
  group: Group | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const isEdit = Boolean(group);
  const [name, setName] = useState(group?.name ?? '');
  const [description, setDescription] = useState(group?.description ?? '');
  const [roleSelections, setRoleSelections] = useState<Record<string, GroupMemberType | 'none'>>(() => {
    const initial: Record<string, GroupMemberType | 'none'> = {};
    for (const role of MOCK_ROLES) {
      const existing = group?.members.find((member) => member.id === role.id && member.type !== 'USER');
      initial[role.id] = existing ? existing.type : 'none';
    }
    return initial;
  });
  const [userSelections, setUserSelections] = useState<Set<string>>(
    () => new Set(group?.members.filter((member) => member.type === 'USER').map((member) => member.id)),
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [nameError, setNameError] = useState<string | undefined>();

  async function handleSubmit() {
    if (!name.trim()) {
      setNameError('Name is required');
      return;
    }
    setIsSubmitting(true);
    await new Promise((resolve) => setTimeout(resolve, 200));

    const members: GroupMember[] = [
      ...MOCK_ROLES.filter((role) => roleSelections[role.id] !== 'none').map((role) => ({
        id: role.id,
        type: roleSelections[role.id] as GroupMemberType,
        label: roleSelections[role.id] === 'ROLE_AND_SUBORDINATES' ? `${role.name} (+ subordinates)` : role.name,
      })),
      ...MOCK_USERS.filter((user) => userSelections.has(user.id)).map((user) => ({
        id: user.id,
        type: 'USER' as const,
        label: `${user.firstName} ${user.lastName}`,
      })),
    ];

    if (group) {
      updateGroup(group.id, { name, description, members });
    } else {
      addGroup({ name, description, members });
    }
    setIsSubmitting(false);
    onSaved();
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? `Edit ${group?.name}` : 'Create Group'}</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          <FormField id="group-name" label="Name" required error={nameError}>
            <input
              id="group-name"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setNameError(undefined);
              }}
              disabled={isSubmitting}
              className="border-border bg-background w-full rounded-md border px-3 py-2 text-sm disabled:opacity-50"
            />
          </FormField>
          <FormField id="group-description" label="Description">
            <input
              id="group-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={isSubmitting}
              className="border-border bg-background w-full rounded-md border px-3 py-2 text-sm disabled:opacity-50"
            />
          </FormField>

          <fieldset>
            <legend className="text-foreground text-sm font-medium">Roles</legend>
            <div className="mt-2 flex flex-col gap-2">
              {MOCK_ROLES.map((role) => (
                <div key={role.id} className="flex items-center justify-between gap-3 text-sm">
                  <span>{role.name}</span>
                  <select
                    value={roleSelections[role.id]}
                    onChange={(e) =>
                      setRoleSelections((prev) => ({ ...prev, [role.id]: e.target.value as GroupMemberType | 'none' }))
                    }
                    disabled={isSubmitting}
                    className="border-border bg-background rounded-md border px-2 py-1 text-xs disabled:opacity-50"
                  >
                    <option value="none">Not included</option>
                    <option value="ROLE">Role only</option>
                    <option value="ROLE_AND_SUBORDINATES">Role + subordinates</option>
                  </select>
                </div>
              ))}
            </div>
          </fieldset>

          <fieldset>
            <legend className="text-foreground text-sm font-medium">Individual Users</legend>
            <div className="mt-2 flex max-h-40 flex-col gap-2 overflow-y-auto">
              {MOCK_USERS.map((user) => (
                <label key={user.id} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={userSelections.has(user.id)}
                    onChange={(e) =>
                      setUserSelections((prev) => {
                        const next = new Set(prev);
                        if (e.target.checked) {next.add(user.id);}
                        else {next.delete(user.id);}
                        return next;
                      })
                    }
                    disabled={isSubmitting}
                    className="border-border size-4 rounded"
                  />
                  {user.firstName} {user.lastName}
                </label>
              ))}
            </div>
          </fieldset>
        </div>
        <DialogFooter>
          <Button type="button" variant="secondary" disabled={isSubmitting} onClick={onClose}>
            Cancel
          </Button>
          <Button type="button" disabled={isSubmitting} onClick={handleSubmit}>
            {isSubmitting ? 'Saving…' : 'Save'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
