'use client';

import { useEffect, useState } from 'react';

import { Button } from '@/components/ui/button';
import { apiFetch } from '@/lib/api';

interface Tenant {
  id: string;
  subdomain: string;
  type: 'live' | 'demo' | 'testing';
  runtimeMode: 'live' | 'sandbox';
  createdAt: string;
}

const EMPTY_FORM = { subdomain: '', type: 'testing', superAdminEmail: '', superAdminPassword: '' };

// Tenant list/create (design doc §5/§8) — GET/POST /skeleton/tenants.
export default function TenantsPage() {
  const [tenants, setTenants] = useState<Tenant[] | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function loadTenants() {
    const data = await apiFetch<Tenant[]>('/skeleton/tenants');
    setTenants(data);
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial data fetch on mount
    loadTenants().catch((err: unknown) => setError(err instanceof Error ? err.message : String(err)));
  }, []);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await apiFetch('/skeleton/tenants', { method: 'POST', body: JSON.stringify(form) });
      setForm(EMPTY_FORM);
      await loadTenants();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex flex-col gap-8">
      <section>
        <h1 className="mb-4 text-xl font-bold">Tenants</h1>
        {error && <p className="text-destructive mb-2 text-sm">{error}</p>}
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-border border-b">
              <th className="py-2">Subdomain</th>
              <th className="py-2">Type</th>
              <th className="py-2">Runtime mode</th>
              <th className="py-2">Created</th>
            </tr>
          </thead>
          <tbody>
            {tenants?.map((tenant) => (
              <tr key={tenant.id} className="border-border border-b">
                <td className="py-2">{tenant.subdomain}</td>
                <td className="py-2">{tenant.type}</td>
                <td className="py-2">{tenant.runtimeMode}</td>
                <td className="py-2">{new Date(tenant.createdAt).toLocaleString()}</td>
              </tr>
            ))}
            {tenants && tenants.length === 0 && (
              <tr>
                <td colSpan={4} className="text-muted-foreground py-4">
                  No tenants provisioned yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </section>

      <section>
        <h2 className="mb-4 text-lg font-bold">Provision new tenant</h2>
        <form onSubmit={handleSubmit} className="flex max-w-md flex-col gap-3">
          <input
            required
            placeholder="Subdomain (e.g. wbc)"
            value={form.subdomain}
            onChange={(e) => setForm({ ...form, subdomain: e.target.value })}
            className="border-border rounded-md border px-3 py-2 text-sm"
          />
          <select
            value={form.type}
            onChange={(e) => setForm({ ...form, type: e.target.value })}
            className="border-border rounded-md border px-3 py-2 text-sm"
          >
            <option value="testing">testing</option>
            <option value="demo">demo</option>
            <option value="live">live</option>
          </select>
          <input
            required
            type="email"
            placeholder="Super Admin email"
            value={form.superAdminEmail}
            onChange={(e) => setForm({ ...form, superAdminEmail: e.target.value })}
            className="border-border rounded-md border px-3 py-2 text-sm"
          />
          <input
            required
            type="password"
            minLength={8}
            placeholder="Super Admin password"
            value={form.superAdminPassword}
            onChange={(e) => setForm({ ...form, superAdminPassword: e.target.value })}
            className="border-border rounded-md border px-3 py-2 text-sm"
          />
          <Button type="submit" disabled={submitting}>
            {submitting ? 'Provisioning…' : 'Provision tenant'}
          </Button>
        </form>
      </section>
    </div>
  );
}
