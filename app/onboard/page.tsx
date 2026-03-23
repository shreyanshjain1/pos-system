'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';

const POS_TYPES = [
  { value: 'RETAIL', label: 'Retail' },
  { value: 'COFFEE', label: 'Coffee' },
  { value: 'FOOD', label: 'Food' },
  { value: 'BUILDING_MATERIALS', label: 'Building Materials' },
  { value: 'SERVICES', label: 'Services' }
] as const;

export default function OnboardPage() {
  const router = useRouter();
  const [shopName, setShopName] = useState('');
  const [posType, setPosType] = useState<(typeof POS_TYPES)[number]['value']>('RETAIL');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setLoading(true);

    const response = await fetch('/api/onboard', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ shopName, posType })
    });

    const data = await response.json().catch(() => ({ error: 'Unable to create shop.' }));
    setLoading(false);

    if (!response.ok) {
      setError(data.error ?? 'Unable to create shop.');
      return;
    }

    router.push('/dashboard');
    router.refresh();
  }

  return (
    <main className="min-h-screen bg-stone-50">
      <div className="mx-auto flex min-h-screen max-w-6xl items-center px-6 py-12">
        <div className="grid w-full overflow-hidden rounded-3xl border border-stone-200 bg-white shadow-xl md:grid-cols-[1.05fr_0.95fr]">
          <section className="bg-gradient-to-br from-emerald-600 to-emerald-700 p-10 text-white">
            <div className="mb-6 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-white/15 text-2xl font-black">V</div>
            <h1 className="text-4xl font-black leading-tight">Create your first shop</h1>
            <p className="mt-4 max-w-xl text-base leading-7 text-emerald-50">
              This creates your business workspace, default settings, and admin membership.
            </p>
          </section>

          <section className="p-8 md:p-10">
            <h2 className="text-3xl font-black text-stone-900">Business setup</h2>
            <form onSubmit={onSubmit} className="mt-8 space-y-6">
              <div>
                <label className="mb-2 block text-sm font-semibold text-stone-800">Store name</label>
                <Input value={shopName} onChange={(e) => setShopName(e.target.value)} placeholder="e.g. Vertex Retail Store" required />
              </div>

              <div>
                <label className="mb-3 block text-sm font-semibold text-stone-800">Shop type</label>
                <div className="grid gap-3 sm:grid-cols-2">
                  {POS_TYPES.map((item) => (
                    <button
                      key={item.value}
                      type="button"
                      onClick={() => setPosType(item.value)}
                      className={`rounded-2xl border px-4 py-4 text-left transition ${
                        posType === item.value
                          ? 'border-emerald-600 bg-emerald-50 text-emerald-700'
                          : 'border-stone-200 bg-white text-stone-700 hover:border-stone-300'
                      }`}
                    >
                      <div className="font-semibold">{item.label}</div>
                      <div className="mt-1 text-xs">{item.value.replaceAll('_', ' ')}</div>
                    </button>
                  ))}
                </div>
              </div>

              {error ? <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div> : null}

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? 'Creating shop...' : 'Create shop'}
              </Button>
            </form>
          </section>
        </div>
      </div>
    </main>
  );
}
