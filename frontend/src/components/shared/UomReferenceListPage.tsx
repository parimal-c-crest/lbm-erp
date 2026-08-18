'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { Plus } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { RowAction, RowActions } from '@/components/shared/RowActions';
import { UomSubNav } from '@/components/shared/UomSubNav';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { FormField } from '@/components/ui/form-field';
import { errorMessage } from '@/lib/api/uom';

// Shared List/Edit pattern for UOM's three flat reference-data screens (Category, Type,
// Functional Role — `docs-kit/5-modules/uom/9-ui.md` §4: "Same layout/interaction pattern as
// Category List/Edit"). One component avoids three near-identical copies of the same
// DataTable + Add/Edit Dialog + soft-delete-with-in-use-guard logic (T-065/T-066/T-067).

export interface UomReferenceItem {
  id: string;
  name: string;
  sortOrder: number;
  createdAt: string;
}

export interface CategoryOption {
  id: string;
  name: string;
}

export function UomReferenceListPage<T extends UomReferenceItem>({
  title,
  description,
  addLabel,
  emptyStateMessage,
  items,
  loading,
  loadError,
  onAdd,
  onUpdate,
  onDelete,
  onRefresh,
  categoryOptions,
  categoryIdFor,
  categoryLabelFor,
}: {
  title: string;
  description: string;
  addLabel: string;
  emptyStateMessage: string;
  items: T[];
  /** Real backend fetch state (EPIC-011) — replaces the old synchronous mock-array assumption. */
  loading?: boolean;
  loadError?: string | null;
  onAdd: (input: { name: string; sortOrder: number; categoryId: string | null }) => Promise<void>;
  onUpdate: (
    id: string,
    input: { name: string; sortOrder: number; categoryId: string | null },
  ) => Promise<void>;
  /** Returns `{ ok, error }` — `error` surfaces BR-014's in-use guard reason inline. */
  onDelete: (id: string) => Promise<{ ok: boolean; error?: string }>;
  /** Re-fetches the list from the real backend after a successful add/update/delete. */
  onRefresh: () => void | Promise<void>;
  /** ADR-192 — only Type List/Edit passes this, enabling the optional Category picker. */
  categoryOptions?: CategoryOption[];
  categoryIdFor?: (item: T) => string | null;
  categoryLabelFor?: (item: T) => string;
}) {
  const [editing, setEditing] = useState<T | 'new' | null>(null);
  const [deleteError, setDeleteError] = useState<{ id: string; message: string } | null>(null);
  const [search, setSearch] = useState('');

  const sorted = useMemo(
    () =>
      [...items]
        .filter((row) => row.name.toLowerCase().includes(search.trim().toLowerCase()))
        .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0)),
    [items, search],
  );

  async function handleDelete(item: T) {
    setDeleteError(null);
    const result = await onDelete(item.id);
    if (!result.ok) {
      setDeleteError({ id: item.id, message: result.error ?? 'Still in use — cannot delete.' });
      return;
    }
    await onRefresh();
  }

  return (
    <div className="flex flex-col gap-6 p-6">
      <div>
        <h1 className="font-display text-foreground text-2xl font-bold">Unit of Measure</h1>
        <p className="text-muted-foreground text-sm">Settings → System Configuration → Unit of Measure</p>
      </div>

      <UomSubNav />

      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-foreground text-lg font-semibold">{title}</h2>
          <p className="text-muted-foreground text-sm">{description}</p>
        </div>
        <Button onClick={() => setEditing('new')}>
          <Plus className="size-4" aria-hidden="true" />
          {addLabel}
        </Button>
      </div>

      <input
        type="search"
        placeholder={`Search ${title.toLowerCase()}…`}
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="border-border bg-background w-full max-w-xs rounded-md border px-3 py-2 text-sm"
        aria-label={`Search ${title.toLowerCase()}`}
      />

      {loadError && (
        <div role="alert" className="border-destructive/40 bg-destructive/10 text-destructive rounded-lg border p-4 text-sm">
          {loadError}
        </div>
      )}

      <div className="border-border bg-card overflow-hidden rounded-lg border">
        {loading ? (
          <div className="text-muted-foreground p-12 text-center text-sm">Loading…</div>
        ) : sorted.length === 0 ? (
          <div className="flex flex-col items-center gap-3 p-12 text-center">
            <p className="text-foreground font-medium">{emptyStateMessage}</p>
            <Button size="sm" onClick={() => setEditing('new')}>
              {addLabel}
            </Button>
          </div>
        ) : (
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-border text-muted-foreground bg-accent/40 border-b">
                <th className="px-4 py-3 font-medium">Name</th>
                {categoryOptions && <th className="px-4 py-3 font-medium">Category</th>}
                <th className="px-4 py-3 font-medium">Sort Order</th>
                <th className="px-4 py-3 font-medium">Created At</th>
                <th className="px-4 py-3 font-medium">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((item) => (
                <tr key={item.id} className="border-border hover:bg-accent/30 border-b last:border-0 align-top">
                  <td className="text-foreground px-4 py-3 font-medium">{item.name}</td>
                  {categoryOptions && (
                    <td className="text-muted-foreground px-4 py-3">{categoryLabelFor?.(item) ?? '—'}</td>
                  )}
                  <td className="text-muted-foreground px-4 py-3">{item.sortOrder}</td>
                  <td className="text-muted-foreground px-4 py-3">{new Date(item.createdAt).toLocaleDateString('en-US')}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex flex-col items-end gap-1">
                      <RowActions>
                        <RowAction.Edit onClick={() => setEditing(item)} />
                        <RowAction.Delete onClick={() => handleDelete(item)} />
                      </RowActions>
                      {deleteError?.id === item.id && (
                        <p role="alert" className="text-destructive max-w-xs text-right text-xs">
                          {deleteError.message}
                        </p>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {editing && (
        <ReferenceFormDialog
          item={editing === 'new' ? null : editing}
          categoryOptions={categoryOptions}
          categoryIdFor={categoryIdFor}
          onClose={() => setEditing(null)}
          onSave={async (values) => {
            if (editing === 'new') {
              await onAdd(values);
            } else {
              await onUpdate(editing.id, values);
            }
            await onRefresh();
            setEditing(null);
          }}
        />
      )}
    </div>
  );
}

const formSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  sortOrder: z
    .string()
    .min(1, 'Sort Order is required')
    .refine((value) => Number.isInteger(Number(value)), 'Sort Order must be a whole number'),
  categoryId: z.string(),
});
type FormValues = z.infer<typeof formSchema>;

function ReferenceFormDialog<T extends UomReferenceItem>({
  item,
  categoryOptions,
  categoryIdFor,
  onClose,
  onSave,
}: {
  item: T | null;
  categoryOptions?: CategoryOption[];
  categoryIdFor?: (item: T) => string | null;
  onClose: () => void;
  onSave: (values: { name: string; sortOrder: number; categoryId: string | null }) => Promise<void>;
}) {
  const isEdit = Boolean(item);
  const [saveError, setSaveError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: item?.name ?? '',
      sortOrder: String(item?.sortOrder ?? 0),
      categoryId: item && categoryIdFor ? (categoryIdFor(item) ?? '') : '',
    },
  });

  async function onSubmit(values: FormValues) {
    setSaveError(null);
    try {
      await onSave({ name: values.name, sortOrder: Number(values.sortOrder), categoryId: values.categoryId || null });
    } catch (error) {
      setSaveError(errorMessage(error));
    }
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? `Edit ${item?.name}` : 'Add'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-4">
          {saveError && (
            <div role="alert" className="border-destructive/40 bg-destructive/10 text-destructive rounded-md border p-3 text-sm">
              {saveError}
            </div>
          )}
          <FormField id="ref-name" label="Name" required error={errors.name?.message}>
            <input
              id="ref-name"
              disabled={isSubmitting}
              className="border-border bg-background w-full rounded-md border px-3 py-2 text-sm disabled:opacity-50"
              {...register('name')}
            />
          </FormField>
          <FormField id="ref-sort-order" label="Sort Order" required error={errors.sortOrder?.message}>
            <input
              id="ref-sort-order"
              type="number"
              disabled={isSubmitting}
              className="border-border bg-background w-full rounded-md border px-3 py-2 text-sm disabled:opacity-50"
              {...register('sortOrder')}
            />
          </FormField>
          {categoryOptions && (
            <FormField id="ref-category" label="Category">
              <select
                id="ref-category"
                disabled={isSubmitting}
                className="border-border bg-background w-full rounded-md border px-3 py-2 text-sm disabled:opacity-50"
                {...register('categoryId')}
              >
                <option value="">None</option>
                {categoryOptions.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
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
