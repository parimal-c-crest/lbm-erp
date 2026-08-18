'use client';

import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { FormField } from '@/components/ui/form-field';
import { massUpdateUsers, MOCK_LOCATIONS, MOCK_ROLES, MOCK_USERS } from '@/lib/mock-data/users';

type Field = 'status' | 'roleId' | 'defaultLocation';

// Mass Update (`docs-kit/5-modules/users/9-ui.md` §2 Mass Update) — Admin-only field/value
// picker applied to every selected user.
export default function MassUpdatePage() {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [field, setField] = useState<Field>('status');
  const [value, setValue] = useState('active');
  const [result, setResult] = useState<number | null>(null);

  function toggle(userId: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(userId)) {next.delete(userId);}
      else {next.add(userId);}
      return next;
    });
  }

  function handleApply() {
    const count = massUpdateUsers([...selected], field, value);
    setResult(count);
  }

  return (
    <div className="flex flex-col gap-6 p-6">
      <div>
        <h1 className="font-display text-foreground text-2xl font-bold">Mass Update</h1>
        <p className="text-muted-foreground text-sm">Admin-only — apply one field/value change to multiple users at once.</p>
      </div>

      <div className="border-border bg-card max-w-md rounded-lg border p-6">
        <div className="flex flex-col gap-4">
          <FormField id="field" label="Field">
            <select
              id="field"
              value={field}
              onChange={(e) => {
                const next = e.target.value as Field;
                setField(next);
                setValue(next === 'status' ? 'active' : next === 'roleId' ? MOCK_ROLES[0].id : MOCK_LOCATIONS[0]);
              }}
              className="border-border bg-background w-full rounded-md border px-3 py-2 text-sm"
            >
              <option value="status">Account Status</option>
              <option value="roleId">Role</option>
              <option value="defaultLocation">Default Location</option>
            </select>
          </FormField>

          <FormField id="value" label="New Value">
            {field === 'status' && (
              <select id="value" value={value} onChange={(e) => setValue(e.target.value)} className="border-border bg-background w-full rounded-md border px-3 py-2 text-sm">
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            )}
            {field === 'roleId' && (
              <select id="value" value={value} onChange={(e) => setValue(e.target.value)} className="border-border bg-background w-full rounded-md border px-3 py-2 text-sm">
                {MOCK_ROLES.map((role) => (
                  <option key={role.id} value={role.id}>
                    {role.name}
                  </option>
                ))}
              </select>
            )}
            {field === 'defaultLocation' && (
              <select id="value" value={value} onChange={(e) => setValue(e.target.value)} className="border-border bg-background w-full rounded-md border px-3 py-2 text-sm">
                {MOCK_LOCATIONS.map((location) => (
                  <option key={location} value={location}>
                    {location}
                  </option>
                ))}
              </select>
            )}
          </FormField>
        </div>
      </div>

      <div className="border-border bg-card overflow-hidden rounded-lg border">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-border text-muted-foreground bg-accent/40 border-b">
              <th className="px-4 py-3 font-medium">
                <input
                  type="checkbox"
                  aria-label="Select all users"
                  checked={selected.size === MOCK_USERS.length}
                  onChange={(e) => setSelected(e.target.checked ? new Set(MOCK_USERS.map((u) => u.id)) : new Set())}
                  className="border-border size-4 rounded"
                />
              </th>
              <th className="px-4 py-3 font-medium">Name</th>
              <th className="px-4 py-3 font-medium">Email</th>
            </tr>
          </thead>
          <tbody>
            {MOCK_USERS.map((user) => (
              <tr key={user.id} className="border-border border-b last:border-0">
                <td className="px-4 py-3">
                  <input
                    type="checkbox"
                    checked={selected.has(user.id)}
                    onChange={() => toggle(user.id)}
                    className="border-border size-4 rounded"
                    aria-label={`Select ${user.firstName} ${user.lastName}`}
                  />
                </td>
                <td className="text-foreground px-4 py-3 font-medium">
                  {user.firstName} {user.lastName}
                </td>
                <td className="text-muted-foreground px-4 py-3">{user.email}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex items-center gap-4">
        <Button type="button" disabled={selected.size === 0} onClick={handleApply}>
          Apply to {selected.size} User{selected.size === 1 ? '' : 's'}
        </Button>
        {result !== null && (
          <p role="status" aria-live="polite" className="text-success text-sm">
            Updated {result} user{result === 1 ? '' : 's'}.
          </p>
        )}
      </div>
    </div>
  );
}
