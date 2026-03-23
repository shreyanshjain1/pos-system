'use client';

import { useState } from 'react';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';

type Supplier = {
  id: string;
  name: string;
  contactName: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  notes: string | null;
};

export default function SupplierManager({ initialSuppliers }: { initialSuppliers: Supplier[] }) {
  const [suppliers, setSuppliers] = useState(initialSuppliers);
  const [form, setForm] = useState({
    name: '',
    contactName: '',
    email: '',
    phone: '',
    address: '',
    notes: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function createSupplier(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setLoading(true);

    const response = await fetch('/api/suppliers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form)
    });

    const data = await response.json().catch(() => ({ error: 'Failed to create supplier.' }));
    setLoading(false);

    if (!response.ok) {
      setError(data.error ?? 'Failed to create supplier.');
      return;
    }

    setSuppliers((prev) => [data.supplier, ...prev]);
    setForm({ name: '', contactName: '', email: '', phone: '', address: '', notes: '' });
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
      <div className="rounded-3xl border border-stone-200 bg-white p-6 shadow-sm">
        <div className="mb-4 text-lg font-black text-stone-900">Add supplier</div>
        <form onSubmit={createSupplier} className="grid gap-4">
          <Input placeholder="Supplier name" value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} required />
          <Input placeholder="Contact name" value={form.contactName} onChange={(e) => setForm((p) => ({ ...p, contactName: e.target.value }))} />
          <Input placeholder="Email" value={form.email} onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))} />
          <Input placeholder="Phone" value={form.phone} onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))} />
          <Input placeholder="Address" value={form.address} onChange={(e) => setForm((p) => ({ ...p, address: e.target.value }))} />
          <Input placeholder="Notes" value={form.notes} onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))} />
          {error ? <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div> : null}
          <Button type="submit" disabled={loading}>{loading ? 'Saving...' : 'Save supplier'}</Button>
        </form>
      </div>

      <div className="rounded-3xl border border-stone-200 bg-white p-6 shadow-sm">
        <div className="mb-4 text-lg font-black text-stone-900">Suppliers</div>
        <div className="space-y-3">
          {suppliers.length ? suppliers.map((supplier) => (
            <div key={supplier.id} className="rounded-2xl border border-stone-200 p-4">
              <div className="font-semibold text-stone-900">{supplier.name}</div>
              <div className="mt-1 text-sm text-stone-600">
                {supplier.contactName || 'No contact'} • {supplier.phone || 'No phone'}
              </div>
              <div className="mt-1 text-sm text-stone-500">{supplier.email || 'No email'} • {supplier.address || 'No address'}</div>
              {supplier.notes ? <div className="mt-2 text-sm text-stone-600">{supplier.notes}</div> : null}
            </div>
          )) : <div className="text-sm text-stone-500">No suppliers yet.</div>}
        </div>
      </div>
    </div>
  );
}
