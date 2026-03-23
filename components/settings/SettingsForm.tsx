'use client';

import { useState } from 'react';
import AppHeader from '@/components/layout/AppHeader';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';

export default function SettingsForm({
  initial
}: {
  initial: {
    currencySymbol: string;
    taxRate: string;
    receiptFooter: string;
    lowStockEnabled: boolean;
    lowStockThreshold: string;
  };
}) {
  const [form, setForm] = useState(initial);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage('');
    setError('');

    const response = await fetch('/api/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        currencySymbol: form.currencySymbol,
        taxRate: Number(form.taxRate),
        receiptFooter: form.receiptFooter,
        lowStockEnabled: form.lowStockEnabled,
        lowStockThreshold: Number(form.lowStockThreshold)
      })
    });

    const data = await response.json().catch(() => ({ error: 'Failed to save settings.' }));
    if (!response.ok) {
      setError(data.error ?? 'Failed to save settings.');
      return;
    }

    setMessage('Settings saved successfully.');
  }

  return (
    <div className="space-y-6">
      <AppHeader title="Settings" subtitle="Configure tax, receipt footer, currency, and low-stock behavior." />
      <form onSubmit={onSubmit} className="rounded-3xl border border-stone-200 bg-white p-6 shadow-sm">
        <div className="grid gap-4 md:grid-cols-2">
          <Input placeholder="Currency symbol" value={form.currencySymbol} onChange={(e) => setForm((p) => ({ ...p, currencySymbol: e.target.value }))} />
          <Input type="number" step="0.01" placeholder="Tax rate" value={form.taxRate} onChange={(e) => setForm((p) => ({ ...p, taxRate: e.target.value }))} />
          <div className="md:col-span-2">
            <Input placeholder="Receipt footer" value={form.receiptFooter} onChange={(e) => setForm((p) => ({ ...p, receiptFooter: e.target.value }))} />
          </div>
          <label className="flex items-center gap-3 text-sm font-medium text-stone-700">
            <input type="checkbox" checked={form.lowStockEnabled} onChange={(e) => setForm((p) => ({ ...p, lowStockEnabled: e.target.checked }))} />
            Enable low stock notifications
          </label>
          <Input type="number" placeholder="Low stock threshold" value={form.lowStockThreshold} onChange={(e) => setForm((p) => ({ ...p, lowStockThreshold: e.target.value }))} />
        </div>

        {error ? <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div> : null}
        {message ? <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{message}</div> : null}

        <Button type="submit" className="mt-6">Save settings</Button>
      </form>
    </div>
  );
}
