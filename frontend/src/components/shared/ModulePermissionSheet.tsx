'use client';

import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import type { ModulePermission } from '@/types/user';

const ACTIONS: { key: keyof ModulePermission; label: string }[] = [
  { key: 'view', label: 'View' },
  { key: 'create', label: 'Create' },
  { key: 'edit', label: 'Edit' },
  { key: 'delete', label: 'Delete' },
];

// Mobile drill-in for one module's field/action toggles — `RoleProfileGrid`'s mobile counterpart
// to the desktop matrix cell row (`9-ui.md` §8). Dismissible by swipe-down/tap-out (Sheet default).
export function ModulePermissionSheet({
  moduleLabel,
  permission,
  onChange,
  onClose,
}: {
  moduleLabel: string;
  permission: ModulePermission;
  onChange: (permission: ModulePermission) => void;
  onClose: () => void;
}) {
  return (
    <Sheet open onOpenChange={(open) => !open && onClose()}>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>{moduleLabel}</SheetTitle>
        </SheetHeader>
        <div className="flex flex-col gap-3 p-4">
          {ACTIONS.map((action) => (
            <label key={action.key} className="flex items-center justify-between text-sm">
              {action.label}
              <input
                type="checkbox"
                checked={permission[action.key]}
                onChange={(e) => onChange({ ...permission, [action.key]: e.target.checked })}
                className="border-border size-4 rounded"
                aria-label={`${action.label} — ${moduleLabel}`}
              />
            </label>
          ))}
        </div>
      </SheetContent>
    </Sheet>
  );
}
