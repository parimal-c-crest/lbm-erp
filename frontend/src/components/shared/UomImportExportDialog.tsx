'use client';

import { useMemo, useState, type ChangeEvent } from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { errorMessage, exportGroups, importGroups, listCategories, listTypes } from '@/lib/api/uom';

type Mode = 'import' | 'export';

interface RowResult {
  row: string[];
  status: 'imported' | 'excluded';
  reason?: string;
}

function parseCsv(text: string): string[][] {
  return text
    .trim()
    .split(/\r?\n/)
    .filter((line) => line.length > 0)
    .map((line) => line.split(',').map((cell) => cell.trim()));
}

// Import/Export dialog for UOM Groups (`docs-kit/5-modules/uom/9-ui.md` §4 Import/Export dialog,
// FR-011) — wired to the real backend (EPIC-011, T-080: `POST /uom/groups/import`,
// `GET /uom/groups/export`). Per-row validation-result display now reflects the real,
// server-side BR-019 completeness check (VR-017), not a client-side mock re-implementation.
export function UomImportExportDialog({
  open,
  onOpenChange,
  onImported,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImported: () => void | Promise<void>;
}) {
  const [mode, setMode] = useState<Mode>('import');
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [csvText, setCsvText] = useState('');
  const [mapping, setMapping] = useState<Record<number, 'name' | 'category' | 'baseType' | ''>>({});
  const [results, setResults] = useState<RowResult[] | null>(null);
  const [processing, setProcessing] = useState(false);
  const [dialogError, setDialogError] = useState<string | null>(null);

  const rows = useMemo(() => parseCsv(csvText), [csvText]);
  const headerRow = rows[0] ?? [];
  const dataRows = rows.slice(1);

  function reset() {
    setStep(1);
    setCsvText('');
    setMapping({});
    setResults(null);
    setDialogError(null);
  }

  function handleClose(next: boolean) {
    if (!next) {reset();}
    onOpenChange(next);
  }

  function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) {return;}
    const reader = new FileReader();
    reader.onload = () => setCsvText(String(reader.result ?? ''));
    reader.readAsText(file);
  }

  function loadSample() {
    setCsvText(
      'Name,Category,Base Type\nRebar Bundles,Length,Linear Foot\nVinyl Siding Bundles,Each,Bundle\n,Weight,Pound',
    );
  }

  async function processImport() {
    setProcessing(true);
    setDialogError(null);
    try {
      const [categoriesPage, typesPage] = await Promise.all([listCategories(), listTypes()]);
      const typeByName = new Map(typesPage.items.map((type) => [type.name.toLowerCase(), type]));
      const categoryByName = new Map(
        categoriesPage.items.map((category) => [category.name.toLowerCase(), category]),
      );

      // Rows this dialog can't even attempt (missing Name/Base Type, unknown Base Type name) are
      // excluded client-side before the call, same as before; every row that resolves to a real
      // payload is sent together to `POST /uom/groups/import` so BR-019's completeness check
      // (VR-017 — identical to an interactive save) runs server-side, not re-implemented here.
      const excluded: RowResult[] = [];
      const importable: { rowRef: string[]; payload: Parameters<typeof importGroups>[0][number] }[] = [];

      for (const row of dataRows) {
        const record: Partial<Record<'name' | 'category' | 'baseType', string>> = {};
        for (const [colIndex, field] of Object.entries(mapping)) {
          if (field) {record[field] = row[Number(colIndex)]?.trim() ?? '';}
        }

        if (!record.name) {
          excluded.push({ row, status: 'excluded', reason: 'Missing Name.' });
          continue;
        }
        if (!record.baseType) {
          excluded.push({ row, status: 'excluded', reason: 'Missing Base Type (BR-002).' });
          continue;
        }
        const baseType = typeByName.get(record.baseType.toLowerCase());
        if (!baseType) {
          excluded.push({ row, status: 'excluded', reason: `Unknown Base Type "${record.baseType}".` });
          continue;
        }
        const category = record.category ? categoryByName.get(record.category.toLowerCase()) : undefined;

        importable.push({
          rowRef: row,
          payload: {
            name: record.name,
            categoryId: category?.id ?? null,
            baseTypeId: baseType.id,
            roleAssignments: [],
            conversionFactors: [],
            pickingHierarchy: [],
          },
        });
      }

      const apiResult = importable.length > 0
        ? await importGroups(importable.map((i) => i.payload))
        : { results: [] };

      const fromApi: RowResult[] = apiResult.results.map((r, index) => ({
        row: importable[index]?.rowRef ?? [r.name],
        status: r.status === 'created' ? 'imported' : 'excluded',
        reason: r.error,
      }));

      setResults([...excluded, ...fromApi]);
      setStep(3);
      await onImported();
    } catch (error) {
      setDialogError(errorMessage(error));
    } finally {
      setProcessing(false);
    }
  }

  async function handleExport() {
    setDialogError(null);
    try {
      const { groups } = await exportGroups();
      const [categoriesPage, typesPage] = await Promise.all([listCategories(), listTypes()]);
      const categoryById = new Map(categoriesPage.items.map((c) => [c.id, c.name]));
      const typeById = new Map(typesPage.items.map((t) => [t.id, t.name]));
      const header = 'Name,Category,Base Type\n';
      const body = groups
        .map((group) => {
          const category = group.categoryId ? (categoryById.get(group.categoryId) ?? '') : '';
          const baseType = typeById.get(group.baseTypeId) ?? '';
          return `${group.name},${category},${baseType}`;
        })
        .join('\n');
      setCsvText(header + body);
    } catch (error) {
      setDialogError(errorMessage(error));
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Import / Export UOM Groups</DialogTitle>
          <DialogDescription>Bulk import or export UOM Group data (FR-011).</DialogDescription>
        </DialogHeader>

        <div className="mb-4 flex gap-2">
          <Button
            type="button"
            size="sm"
            variant={mode === 'import' ? 'primary' : 'secondary'}
            onClick={() => {
              setMode('import');
              reset();
            }}
          >
            Import
          </Button>
          <Button
            type="button"
            size="sm"
            variant={mode === 'export' ? 'primary' : 'secondary'}
            onClick={() => {
              setMode('export');
              void handleExport();
            }}
          >
            Export
          </Button>
        </div>

        {dialogError && (
          <div role="alert" className="border-destructive/40 bg-destructive/10 text-destructive mb-3 rounded-md border p-3 text-sm">
            {dialogError}
          </div>
        )}

        {mode === 'export' && (
          <div className="flex flex-col gap-3">
            <p className="text-muted-foreground text-sm">Groups exported as CSV (Name, Category, Base Type).</p>
            <textarea
              readOnly
              value={csvText}
              rows={8}
              className="border-border bg-background w-full rounded-md border px-3 py-2 font-mono text-xs"
            />
          </div>
        )}

        {mode === 'import' && step === 1 && (
          <div className="flex flex-col gap-3">
            <input type="file" accept=".csv" onChange={handleFileChange} className="text-sm" />
            <div className="flex items-center gap-2 text-sm">
              <span className="text-muted-foreground">or</span>
              <button type="button" onClick={loadSample} className="text-primary font-medium hover:underline">
                load a sample CSV
              </button>
            </div>
            <textarea
              value={csvText}
              onChange={(e) => setCsvText(e.target.value)}
              rows={5}
              placeholder="Name,Category,Base Type"
              className="border-border bg-background w-full rounded-md border px-3 py-2 font-mono text-xs"
            />
          </div>
        )}

        {mode === 'import' && step === 2 && (
          <div className="flex flex-col gap-3">
            {headerRow.map((header, index) => (
              <div key={index} className="flex items-center justify-between gap-3 text-sm">
                <span className="text-foreground font-medium">{header || `Column ${index + 1}`}</span>
                <select
                  value={mapping[index] ?? ''}
                  onChange={(e) => setMapping((prev) => ({ ...prev, [index]: e.target.value as 'name' | 'category' | 'baseType' | '' }))}
                  className="border-border bg-background rounded-md border px-2 py-1 text-xs"
                >
                  <option value="">Ignore</option>
                  <option value="name">Name</option>
                  <option value="category">Category</option>
                  <option value="baseType">Base Type</option>
                </select>
              </div>
            ))}
          </div>
        )}

        {mode === 'import' && step === 3 && results && (
          <div className="flex flex-col gap-3">
            <div className="flex gap-3 text-sm">
              <Badge tone="success">{results.filter((r) => r.status === 'imported').length} imported</Badge>
              <Badge tone="error">{results.filter((r) => r.status === 'excluded').length} excluded</Badge>
            </div>
            <div className="border-border max-h-64 overflow-y-auto rounded-md border">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-border text-muted-foreground bg-accent/40 border-b">
                    <th className="px-3 py-2 font-medium">Row</th>
                    <th className="px-3 py-2 font-medium">Status</th>
                    <th className="px-3 py-2 font-medium">Reason</th>
                  </tr>
                </thead>
                <tbody>
                  {results.map((result, index) => (
                    <tr key={index} className="border-border border-b last:border-0">
                      <td className="text-muted-foreground px-3 py-2">{result.row.join(', ')}</td>
                      <td className="px-3 py-2">
                        <Badge tone={result.status === 'imported' ? 'success' : 'error'}>
                          {result.status === 'imported' ? 'Imported' : 'Excluded'}
                        </Badge>
                      </td>
                      <td className="text-muted-foreground px-3 py-2">{result.reason ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <DialogFooter>
          <Button type="button" variant="secondary" onClick={() => handleClose(false)}>
            Close
          </Button>
          {mode === 'import' && step === 1 && (
            <Button type="button" disabled={rows.length < 2} onClick={() => setStep(2)}>
              Next: Map Columns
            </Button>
          )}
          {mode === 'import' && step === 2 && (
            <Button type="button" disabled={processing} onClick={() => void processImport()}>
              {processing ? 'Validating…' : 'Validate & Process'}
            </Button>
          )}
          {mode === 'import' && step === 3 && (
            <Button type="button" onClick={reset}>
              Import Another File
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
