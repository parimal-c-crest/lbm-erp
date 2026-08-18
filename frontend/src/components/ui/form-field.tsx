import * as React from 'react';

// Label-above-input + below-input error wrapper (`4-ui/5-form-standards.md` §6). Aria wiring
// (`aria-required`/`aria-invalid`/`aria-describedby`) is applied directly on each input by its
// caller rather than auto-cloned here — only 2 fields exist today (T-016's login form); revisit
// with a cloneElement-based auto-wire once enough forms exist to justify it (YAGNI).
export function FormField({
  id,
  label,
  required,
  error,
  children,
}: {
  id: string;
  label: string;
  required?: boolean;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-foreground text-sm font-medium">
        {label}
        {required && (
          <span aria-hidden="true" className="text-destructive">
            {' '}
            *
          </span>
        )}
      </label>
      {children}
      {error && (
        <p id={`${id}-error`} role="alert" className="text-destructive text-sm">
          {error}
        </p>
      )}
    </div>
  );
}
