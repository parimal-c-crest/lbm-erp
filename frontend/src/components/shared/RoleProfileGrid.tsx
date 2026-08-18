'use client';

import { useState } from 'react';

import { Badge } from '@/components/ui/badge';
import { PERMISSION_MODULES } from '@/lib/mock-data/users';
import type { ModulePermission, Profile } from '@/types/user';

import { ModulePermissionSheet } from './ModulePermissionSheet';

const ACTIONS: { key: keyof ModulePermission; label: string }[] = [
  { key: 'view', label: 'View' },
  { key: 'create', label: 'Create' },
  { key: 'edit', label: 'Edit' },
  { key: 'delete', label: 'Delete' },
];

function grantedCount(permission: ModulePermission) {
  return ACTIONS.filter((action) => permission[action.key]).length;
}

// Profile's module/field/action permission grid (`docs-kit/5-modules/users/9-ui.md` §4 Profile
// administration, §6, §8). Desktop/tablet-landscape: dense matrix by nature of its density. On
// mobile: module list + granted-count `Badge`, tap opens `ModulePermissionSheet` (reuses the
// `Sheet` primitive built for Quick Actions, T-018) — resolved with the developer over a simpler
// accordion (§8).
export function RoleProfileGrid({
  profile,
  onChange,
}: {
  profile: Profile;
  onChange: (moduleKey: string, permission: ModulePermission) => void;
}) {
  const [sheetModuleKey, setSheetModuleKey] = useState<string | null>(null);

  return (
    <>
      {/* Desktop/tablet-landscape matrix */}
      <div className="hidden md:block">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-border text-muted-foreground border-b">
              <th className="py-2 font-medium">Module</th>
              {ACTIONS.map((action) => (
                <th key={action.key} className="px-3 py-2 text-center font-medium">
                  {action.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {PERMISSION_MODULES.map((module) => {
              const permission = profile.permissions[module.key];
              return (
                <tr key={module.key} className="border-border border-b last:border-0">
                  <td className="text-foreground py-2 font-medium">{module.label}</td>
                  {ACTIONS.map((action) => (
                    <td key={action.key} className="px-3 py-2 text-center">
                      <input
                        type="checkbox"
                        checked={permission[action.key]}
                        onChange={(e) =>
                          onChange(module.key, { ...permission, [action.key]: e.target.checked })
                        }
                        className="border-border size-4 rounded"
                        aria-label={`${action.label} — ${module.label}`}
                      />
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Mobile: module list -> Sheet drill-in */}
      <div className="flex flex-col gap-2 md:hidden">
        {PERMISSION_MODULES.map((module) => {
          const permission = profile.permissions[module.key];
          const granted = grantedCount(permission);
          return (
            <button
              key={module.key}
              type="button"
              onClick={() => setSheetModuleKey(module.key)}
              className="border-border bg-card flex items-center justify-between rounded-md border p-3 text-left text-sm"
            >
              <span className="text-foreground font-medium">{module.label}</span>
              <Badge tone={granted > 0 ? 'default' : 'default'}>{granted}/{ACTIONS.length} granted</Badge>
            </button>
          );
        })}
      </div>

      {sheetModuleKey && (
        <ModulePermissionSheet
          moduleLabel={PERMISSION_MODULES.find((m) => m.key === sheetModuleKey)?.label ?? ''}
          permission={profile.permissions[sheetModuleKey]}
          onChange={(permission) => onChange(sheetModuleKey, permission)}
          onClose={() => setSheetModuleKey(null)}
        />
      )}
    </>
  );
}
