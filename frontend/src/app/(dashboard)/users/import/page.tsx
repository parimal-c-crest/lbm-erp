'use client';

import { useMemo, useState, type ChangeEvent } from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MOCK_USERS } from '@/lib/mock-data/users';

const TARGET_FIELDS = [
  { key: 'firstName', label: 'First Name' },
  { key: 'lastName', label: 'Last Name' },
  { key: 'username', label: 'Username' },
  { key: 'email', label: 'Email' },
] as const;
type TargetField = (typeof TARGET_FIELDS)[number]['key'];

function parseCsv(text: string): string[][] {
  return text
    .trim()
    .split(/\r?\n/)
    .filter((line) => line.length > 0)
    .map((line) => line.split(',').map((cell) => cell.trim()));
}

interface RowResult {
  row: string[];
  status: 'imported' | 'excluded';
  reason?: string;
}

// CSV Import wizard (`docs-kit/5-modules/users/9-ui.md` §4 CSV Import wizard) — 3-step: Upload
// → Column Mapping → Validate-then-Process. Excluded rows shown with their specific reason
// (barcode/username/role/is-admin-format), matching the source system's row-level (not
// all-or-nothing) exclusion behavior (`2-functional-specification.md` FR-002 Alternate Flow).
export default function CsvImportPage() {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [csvText, setCsvText] = useState('');
  const [mapping, setMapping] = useState<Record<number, TargetField | ''>>({});
  const [results, setResults] = useState<RowResult[] | null>(null);

  const rows = useMemo(() => parseCsv(csvText), [csvText]);
  const headerRow = rows[0] ?? [];
  const dataRows = rows.slice(1);

  function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) {return;}
    const reader = new FileReader();
    reader.onload = () => setCsvText(String(reader.result ?? ''));
    reader.readAsText(file);
  }

  function loadSample() {
    setCsvText(
      'First Name,Last Name,Username,Email\nCarla,Jimenez,cjimenez,cjimenez@lbm.local\nMarcus,Whitfield,mwhitfield,mwhitfield@lbm.local\nDerek,Owusu,,dowusu@lbm.local',
    );
  }

  function processImport() {
    const takenUsernames = new Set(MOCK_USERS.map((u) => u.username));
    const takenEmails = new Set(MOCK_USERS.map((u) => u.email));

    const processed: RowResult[] = dataRows.map((row) => {
      const record: Partial<Record<TargetField, string>> = {};
      for (const [colIndex, field] of Object.entries(mapping)) {
        if (field) {record[field] = row[Number(colIndex)]?.trim() ?? '';}
      }

      if (!record.firstName || !record.lastName) {
        return { row, status: 'excluded', reason: 'Missing first/last name.' };
      }
      if (!record.username) {
        return { row, status: 'excluded', reason: 'Missing username.' };
      }
      if (!record.email) {
        return { row, status: 'excluded', reason: 'Missing email.' };
      }
      if (takenUsernames.has(record.username)) {
        return { row, status: 'excluded', reason: `Username "${record.username}" already exists.` };
      }
      if (takenEmails.has(record.email)) {
        return { row, status: 'excluded', reason: `Email "${record.email}" already exists.` };
      }
      takenUsernames.add(record.username);
      takenEmails.add(record.email);
      return { row, status: 'imported' };
    });

    setResults(processed);
    setStep(3);
  }

  return (
    <div className="flex flex-col gap-6 p-6">
      <div>
        <h1 className="font-display text-foreground text-2xl font-bold">CSV Import</h1>
        <p className="text-muted-foreground text-sm">Step {step} of 3</p>
      </div>

      {step === 1 && (
        <div className="border-border bg-card max-w-xl rounded-lg border p-6">
          <h2 className="text-foreground mb-4 text-sm font-semibold">Upload</h2>
          <input type="file" accept=".csv" onChange={handleFileChange} className="mb-4 text-sm" />
          <div className="mb-4 flex items-center gap-2 text-sm">
            <span className="text-muted-foreground">or</span>
            <button type="button" onClick={loadSample} className="text-primary font-medium hover:underline">
              load a sample CSV
            </button>
          </div>
          <textarea
            value={csvText}
            onChange={(e) => setCsvText(e.target.value)}
            rows={6}
            placeholder="First Name,Last Name,Username,Email"
            className="border-border bg-background w-full rounded-md border px-3 py-2 font-mono text-xs"
          />
          <Button type="button" className="mt-4" disabled={rows.length < 2} onClick={() => setStep(2)}>
            Next: Map Columns
          </Button>
        </div>
      )}

      {step === 2 && (
        <div className="border-border bg-card max-w-xl rounded-lg border p-6">
          <h2 className="text-foreground mb-4 text-sm font-semibold">Column Mapping</h2>
          <div className="flex flex-col gap-3">
            {headerRow.map((header, index) => (
              <div key={index} className="flex items-center justify-between gap-3 text-sm">
                <span className="text-foreground font-medium">{header || `Column ${index + 1}`}</span>
                <select
                  value={mapping[index] ?? ''}
                  onChange={(e) => setMapping((prev) => ({ ...prev, [index]: e.target.value as TargetField | '' }))}
                  className="border-border bg-background rounded-md border px-2 py-1 text-xs"
                >
                  <option value="">Ignore</option>
                  {TARGET_FIELDS.map((field) => (
                    <option key={field.key} value={field.key}>
                      {field.label}
                    </option>
                  ))}
                </select>
              </div>
            ))}
          </div>
          <div className="mt-4 flex gap-3">
            <Button type="button" variant="secondary" onClick={() => setStep(1)}>
              Back
            </Button>
            <Button type="button" onClick={processImport}>
              Validate &amp; Process
            </Button>
          </div>
        </div>
      )}

      {step === 3 && results && (
        <div className="flex flex-col gap-4">
          <div className="flex gap-3 text-sm">
            <Badge tone="success">{results.filter((r) => r.status === 'imported').length} imported</Badge>
            <Badge tone="error">{results.filter((r) => r.status === 'excluded').length} excluded</Badge>
          </div>
          <div className="border-border bg-card overflow-hidden rounded-lg border">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-border text-muted-foreground bg-accent/40 border-b">
                  <th className="px-4 py-3 font-medium">Row</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Reason</th>
                </tr>
              </thead>
              <tbody>
                {results.map((result, index) => (
                  <tr key={index} className="border-border border-b last:border-0">
                    <td className="text-muted-foreground px-4 py-3">{result.row.join(', ')}</td>
                    <td className="px-4 py-3">
                      <Badge tone={result.status === 'imported' ? 'success' : 'error'}>
                        {result.status === 'imported' ? 'Imported' : 'Excluded'}
                      </Badge>
                    </td>
                    <td className="text-muted-foreground px-4 py-3">{result.reason ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Button
            type="button"
            variant="secondary"
            className="self-start"
            onClick={() => {
              setStep(1);
              setCsvText('');
              setMapping({});
              setResults(null);
            }}
          >
            Import Another File
          </Button>
        </div>
      )}
    </div>
  );
}
