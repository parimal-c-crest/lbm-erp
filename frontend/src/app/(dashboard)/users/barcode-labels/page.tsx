'use client';

import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { FormField } from '@/components/ui/form-field';
import { MOCK_ROLES, MOCK_USERS } from '@/lib/mock-data/users';

const LABEL_SIZES = [
  { key: '2x1', label: '2" x 1"' },
  { key: '3x2', label: '3" x 2"' },
  { key: '4x3', label: '4" x 3"' },
] as const;

// Barcode Label print (`docs-kit/5-modules/users/9-ui.md` §2 Barcode Label print) — label-layout
// parameters for the badge-based clock-in fallback (T-035). Optional delivery channel: cloud-print
// service (`2-functional-specification.md` §7) — not modeled here, this screen only builds the
// layout/preview.
export default function BarcodeLabelPage() {
  const [userId, setUserId] = useState(MOCK_USERS[0]?.id ?? '');
  const [size, setSize] = useState<(typeof LABEL_SIZES)[number]['key']>('3x2');
  const [includeName, setIncludeName] = useState(true);
  const [includeRole, setIncludeRole] = useState(true);

  const user = MOCK_USERS.find((candidate) => candidate.id === userId);

  return (
    <div className="flex flex-col gap-6 p-6">
      <div>
        <h1 className="font-display text-foreground text-2xl font-bold">Barcode Label Print</h1>
        <p className="text-muted-foreground text-sm">Generate a badge label for barcode-based clock-in.</p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="border-border bg-card rounded-lg border p-6">
          <h2 className="text-foreground mb-4 text-sm font-semibold">Layout Parameters</h2>
          <div className="flex flex-col gap-4">
            <FormField id="label-user" label="User" required>
              <select
                id="label-user"
                value={userId}
                onChange={(e) => setUserId(e.target.value)}
                className="border-border bg-background w-full rounded-md border px-3 py-2 text-sm"
              >
                {MOCK_USERS.map((candidate) => (
                  <option key={candidate.id} value={candidate.id}>
                    {candidate.firstName} {candidate.lastName}
                  </option>
                ))}
              </select>
            </FormField>

            <FormField id="label-size" label="Label Size" required>
              <select
                id="label-size"
                value={size}
                onChange={(e) => setSize(e.target.value as typeof size)}
                className="border-border bg-background w-full rounded-md border px-3 py-2 text-sm"
              >
                {LABEL_SIZES.map((option) => (
                  <option key={option.key} value={option.key}>
                    {option.label}
                  </option>
                ))}
              </select>
            </FormField>

            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={includeName}
                onChange={(e) => setIncludeName(e.target.checked)}
                className="border-border size-4 rounded"
              />
              Include Name
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={includeRole}
                onChange={(e) => setIncludeRole(e.target.checked)}
                className="border-border size-4 rounded"
              />
              Include Role
            </label>

            <Button type="button" className="self-start" disabled={!user}>
              Print Label
            </Button>
          </div>
        </div>

        <div className="border-border bg-card flex flex-col items-center justify-center rounded-lg border p-6">
          <h2 className="text-foreground mb-4 self-start text-sm font-semibold">Preview</h2>
          {user && (
            <div
              className="border-border flex flex-col items-center justify-center gap-2 border-2 border-dashed bg-white p-4 text-black"
              style={{
                width: size === '2x1' ? 192 : size === '3x2' ? 240 : 288,
                height: size === '2x1' ? 96 : size === '3x2' ? 160 : 216,
              }}
            >
              {includeName && <p className="text-sm font-bold">{user.firstName} {user.lastName}</p>}
              {includeRole && (
                <p className="text-xs">
                  {MOCK_ROLES.find((role) => role.id === user.roleId)?.name ?? user.roleId}
                </p>
              )}
              <div className="flex h-10 items-end gap-0.5" aria-hidden="true">
                {Array.from({ length: 24 }).map((_, i) => (
                  <span key={i} style={{ width: 2, height: 12 + ((i * 7) % 20) }} className="bg-black" />
                ))}
              </div>
              <p className="font-mono text-[10px] tracking-widest">{user.username.toUpperCase()}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
