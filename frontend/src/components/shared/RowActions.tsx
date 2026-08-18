import Link from 'next/link';
import { Eye, Pencil, Trash2, type LucideIcon } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

// Icon-only row actions with a tooltip, project-wide list/table row convention (ADR-193) — every
// list screen's Edit/Open/Delete (and any future row action) uses this instead of a text-label
// button, so the pattern only needs building/fixing once.

interface RowActionProps {
  label: string;
  icon?: LucideIcon;
  variant?: 'default' | 'destructive';
  disabled?: boolean;
  onClick?: () => void;
  href?: string;
}

export function RowAction({ label, onClick, href, icon: Icon = Pencil, variant = 'default', disabled }: RowActionProps) {
  const buttonClassName = cn(
    'size-8',
    variant === 'destructive' && 'text-destructive hover:bg-destructive/10 hover:text-destructive',
  );

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        {href ? (
          <Button asChild variant="ghost" size="icon" aria-label={label} className={buttonClassName}>
            <Link href={href}>
              <Icon className="size-4" aria-hidden="true" />
            </Link>
          </Button>
        ) : (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label={label}
            disabled={disabled}
            onClick={onClick}
            className={buttonClassName}
          >
            <Icon className="size-4" aria-hidden="true" />
          </Button>
        )}
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}

export function RowActions({ children }: { children: React.ReactNode }) {
  return <div className="flex items-center justify-end gap-1">{children}</div>;
}

RowAction.Edit = function EditRowAction(props: Omit<RowActionProps, 'icon' | 'label'> & { label?: string }) {
  return <RowAction icon={Pencil} label={props.label ?? 'Edit'} {...props} />;
};

RowAction.Open = function OpenRowAction(props: Omit<RowActionProps, 'icon' | 'label'> & { label?: string }) {
  return <RowAction icon={Eye} label={props.label ?? 'Open'} {...props} />;
};

RowAction.Delete = function DeleteRowAction(props: Omit<RowActionProps, 'icon' | 'label' | 'variant'> & { label?: string }) {
  return <RowAction icon={Trash2} label={props.label ?? 'Delete'} variant="destructive" {...props} />;
};
