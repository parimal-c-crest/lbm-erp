'use client';

import { GripVertical } from 'lucide-react';
import { useState } from 'react';

import type { Role } from '@/types/user';

// Role hierarchy tree picker (`docs-kit/5-modules/users/9-ui.md` §4 Role administration) —
// expand/collapse/select + drag-and-drop reparenting, recomputes `depth` server-side in the real
// system (mock: `reparentRole` in `lib/mock-data/users.ts`). Native HTML5 drag events — no DnD
// library is locked project-wide (`1-project/4-tech-stack.md` §16), and this is the only
// drag-and-drop interaction in the module so a dependency isn't justified (KISS/YAGNI,
// `6-development/3-coding-standards.md` §3).
export function RoleTree({
  roles,
  onReparent,
  onEdit,
  onDelete,
  onToggleTwoFactor,
}: {
  roles: Role[];
  onReparent: (roleId: string, newParentId: string | null) => void;
  onEdit: (role: Role) => void;
  onDelete: (role: Role) => void;
  onToggleTwoFactor: (role: Role, required: boolean) => void;
}) {
  const [dragOverId, setDragOverId] = useState<string | null>(null);
  const roots = roles.filter((role) => role.parentRoleId === null);

  function renderNode(role: Role): React.ReactNode {
    const children = roles.filter((candidate) => candidate.parentRoleId === role.id);
    return (
      <li key={role.id}>
        <div
          draggable
          onDragStart={(e) => e.dataTransfer.setData('text/plain', role.id)}
          onDragOver={(e) => {
            e.preventDefault();
            setDragOverId(role.id);
          }}
          onDragLeave={() => setDragOverId((prev) => (prev === role.id ? null : prev))}
          onDrop={(e) => {
            e.preventDefault();
            setDragOverId(null);
            const draggedId = e.dataTransfer.getData('text/plain');
            if (draggedId && draggedId !== role.id) {
              onReparent(draggedId, role.id);
            }
          }}
          style={{ marginLeft: role.depth * 24 }}
          className={`border-border bg-card flex items-center gap-3 rounded-md border p-3 ${dragOverId === role.id ? 'border-primary bg-accent/40' : ''}`}
        >
          <GripVertical className="text-muted-foreground size-4 shrink-0 cursor-grab" aria-hidden="true" />
          <div className="min-w-0 flex-1">
            <p className="text-foreground truncate text-sm font-medium">{role.name}</p>
            <p className="text-muted-foreground truncate text-xs">{role.description}</p>
          </div>
          <label className="flex items-center gap-2 text-xs whitespace-nowrap">
            <input
              type="checkbox"
              checked={role.requiresTwoFactor}
              onChange={(e) => onToggleTwoFactor(role, e.target.checked)}
              className="border-border size-4 rounded"
              aria-label={`Require 2FA for ${role.name}`}
            />
            Require 2FA
          </label>
          <button type="button" onClick={() => onEdit(role)} className="text-primary text-sm font-medium hover:underline">
            Edit
          </button>
          <button type="button" onClick={() => onDelete(role)} className="text-destructive text-sm font-medium hover:underline">
            Delete
          </button>
        </div>
        {children.length > 0 && (
          <ul className="mt-2 flex flex-col gap-2">{children.map((child) => renderNode(child))}</ul>
        )}
      </li>
    );
  }

  // Root-level drop zone — dragging a role here clears its parent (promotes to top level).
  return (
    <div className="flex flex-col gap-3">
      <ul className="flex flex-col gap-2">{roots.map((role) => renderNode(role))}</ul>
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOverId('__root__');
        }}
        onDragLeave={() => setDragOverId((prev) => (prev === '__root__' ? null : prev))}
        onDrop={(e) => {
          e.preventDefault();
          setDragOverId(null);
          const draggedId = e.dataTransfer.getData('text/plain');
          if (draggedId) {onReparent(draggedId, null);}
        }}
        className={`border-border text-muted-foreground rounded-md border border-dashed p-3 text-center text-xs ${dragOverId === '__root__' ? 'border-primary bg-accent/40' : ''}`}
      >
        Drop here to move a role to the top level
      </div>
    </div>
  );
}
