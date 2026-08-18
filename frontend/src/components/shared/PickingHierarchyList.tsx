'use client';

import { ChevronDown, ChevronUp, GripVertical, X } from 'lucide-react';

import { cn } from '@/lib/utils';

export interface PickingHierarchyRowView {
  typeId: string;
  typeName: string;
}

// Ordered, drag-reorderable list of Types for a Group's Picking Hierarchy
// (`docs-kit/5-modules/uom/9-ui.md` §4 Group Detail/Edit, §9 Accessibility) — "uses picking
// hierarchy" is simply "has at least one row here" (ADR-192/BR-013), not gated behind a toggle.
// Keyboard-accessible reorder affordance (up/down buttons) alongside native HTML5 drag-and-drop,
// per `9-ui.md` §9's explicit "not drag-only" requirement.
export function PickingHierarchyList({
  rows,
  disabled,
  onReorder,
  onRemove,
}: {
  rows: PickingHierarchyRowView[];
  disabled?: boolean;
  onReorder: (fromIndex: number, toIndex: number) => void;
  onRemove: (typeId: string) => void;
}) {
  if (rows.length === 0) {
    return (
      <p className="text-muted-foreground text-sm">
        No Picking Hierarchy rows yet — add a Type below to enable pick-quantity breakdown for this Group.
      </p>
    );
  }

  return (
    <ol className="flex flex-col gap-1.5" aria-label="Picking Hierarchy order">
      {rows.map((row, index) => (
        <li
          key={row.typeId}
          draggable={!disabled}
          onDragStart={(e) => e.dataTransfer.setData('text/plain', String(index))}
          onDragOver={(e) => !disabled && e.preventDefault()}
          onDrop={(e) => {
            if (disabled) {return;}
            e.preventDefault();
            const fromIndex = Number(e.dataTransfer.getData('text/plain'));
            if (!Number.isNaN(fromIndex) && fromIndex !== index) {onReorder(fromIndex, index);}
          }}
          className={cn(
            'border-border bg-background flex items-center gap-3 rounded-md border px-3 py-2 text-sm',
            disabled && 'opacity-60',
          )}
        >
          <GripVertical className="text-muted-foreground size-4 shrink-0" aria-hidden="true" />
          <span className="text-muted-foreground w-6 shrink-0 tabular-nums">{index + 1}.</span>
          <span className="text-foreground flex-1 font-medium">{row.typeName}</span>
          <div className="flex items-center gap-1">
            <button
              type="button"
              disabled={disabled || index === 0}
              onClick={() => onReorder(index, index - 1)}
              aria-label={`Move ${row.typeName} up`}
              className="hover:bg-accent disabled:pointer-events-none disabled:opacity-30 flex size-7 items-center justify-center rounded-md"
            >
              <ChevronUp className="size-4" aria-hidden="true" />
            </button>
            <button
              type="button"
              disabled={disabled || index === rows.length - 1}
              onClick={() => onReorder(index, index + 1)}
              aria-label={`Move ${row.typeName} down`}
              className="hover:bg-accent disabled:pointer-events-none disabled:opacity-30 flex size-7 items-center justify-center rounded-md"
            >
              <ChevronDown className="size-4" aria-hidden="true" />
            </button>
            <button
              type="button"
              disabled={disabled}
              onClick={() => onRemove(row.typeId)}
              aria-label={`Remove ${row.typeName} from Picking Hierarchy`}
              className="hover:bg-accent disabled:pointer-events-none disabled:opacity-30 flex size-7 items-center justify-center rounded-md"
            >
              <X className="size-4" aria-hidden="true" />
            </button>
          </div>
        </li>
      ))}
    </ol>
  );
}
