'use client';

import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { FormField } from '@/components/ui/form-field';

const NOTIFICATION_TYPES = [
  { key: 'order-updates', label: 'Order Status Updates' },
  { key: 'low-stock', label: 'Low Stock Alerts' },
  { key: 'payroll-reminders', label: 'Payroll Reminders' },
  { key: 'system-announcements', label: 'System Announcements' },
];

// Self-service Mail Account + notification-preference screen
// (`docs-kit/5-modules/users/9-ui.md` §2 Mail Account administration) — own account only, no
// admin gate (`2-functional-specification.md` FR-012).
export default function MailAccountSettingsPage() {
  const [displayName, setDisplayName] = useState('Marcus Whitfield');
  const [replyToEmail, setReplyToEmail] = useState('mwhitfield@lbm.local');
  const [signature, setSignature] = useState('');
  const [enabled, setEnabled] = useState<Record<string, boolean>>({
    'order-updates': true,
    'low-stock': true,
    'payroll-reminders': false,
    'system-announcements': true,
  });
  const [saved, setSaved] = useState(false);

  async function handleSave() {
    // Mock only — no real `UserNotificationPreference`/`MailAccount` endpoint until EPIC-005.
    await new Promise((resolve) => setTimeout(resolve, 300));
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <div className="flex w-full flex-col gap-6 p-6">
      <div>
        <h1 className="font-display text-foreground text-2xl font-bold">Mail Account &amp; Notifications</h1>
        <p className="text-muted-foreground text-sm">Your own account settings — nobody else can view or change these.</p>
      </div>

      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-2">
        <div className="border-border bg-card rounded-lg border p-6">
          <h2 className="text-foreground mb-4 text-sm font-semibold">Mail Account</h2>
          <div className="flex flex-col gap-4">
            <FormField id="display-name" label="Display Name">
              <input
                id="display-name"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="border-border bg-background w-full rounded-md border px-3 py-2 text-sm"
              />
            </FormField>
            <FormField id="reply-to" label="Reply-To Email">
              <input
                id="reply-to"
                type="email"
                value={replyToEmail}
                onChange={(e) => setReplyToEmail(e.target.value)}
                className="border-border bg-background w-full rounded-md border px-3 py-2 text-sm"
              />
            </FormField>
            <FormField id="signature" label="Signature">
              <textarea
                id="signature"
                value={signature}
                onChange={(e) => setSignature(e.target.value)}
                rows={3}
                className="border-border bg-background w-full rounded-md border px-3 py-2 text-sm"
              />
            </FormField>
          </div>
        </div>

        <div className="border-border bg-card rounded-lg border p-6">
          <h2 className="text-foreground mb-4 text-sm font-semibold">Notification Preferences</h2>
          <div className="flex flex-col gap-3">
            {NOTIFICATION_TYPES.map((type) => (
              <label key={type.key} className="flex items-center justify-between text-sm">
                {type.label}
                <input
                  type="checkbox"
                  checked={enabled[type.key] ?? false}
                  onChange={(e) => setEnabled((prev) => ({ ...prev, [type.key]: e.target.checked }))}
                  className="border-border size-4 rounded"
                />
              </label>
            ))}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <Button type="button" onClick={handleSave}>
          Save
        </Button>
        {saved && (
          <p role="status" aria-live="polite" className="text-success text-sm">
            Saved.
          </p>
        )}
      </div>
    </div>
  );
}
