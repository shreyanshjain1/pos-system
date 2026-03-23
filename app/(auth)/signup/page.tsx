'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';

export default function SignupPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setLoading(true);

    const response = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form)
    });

    const data = await response.json().catch(() => ({ error: 'Unable to create account.' }));

    if (!response.ok) {
      setLoading(false);
      setError(data.error ?? 'Unable to create account.');
      return;
    }

    const loginResult = await signIn('credentials', {
      email: form.email,
      password: form.password,
      redirect: false
    });

    setLoading(false);

    if (loginResult?.error) {
      setError('Account created, but automatic sign in failed. Please log in.');
      return;
    }

    router.push('/onboard');
    router.refresh();
  }

  return (
    <main className="min-h-screen bg-stone-50">
      <div className="mx-auto grid min-h-screen max-w-6xl items-center px-6 py-12 md:grid-cols-2 md:gap-10">
        <div className="hidden md:block">
          <div className="rounded-3xl bg-gradient-to-br from-emerald-600 to-emerald-700 p-10 text-white shadow-xl">
            <div className="mb-6 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-white/15 text-2xl font-black">V</div>
            <h1 className="text-4xl font-black leading-tight">Create your Vertex POS account</h1>
            <p className="mt-4 text-base leading-7 text-emerald-50">
              Start with a clean auth flow, then onboard your first store and begin managing operations.
            </p>
          </div>
        </div>

        <div className="rounded-3xl border border-stone-200 bg-white p-8 shadow-lg md:p-10">
          <h2 className="text-3xl font-black text-stone-900">Create account</h2>

          <form onSubmit={onSubmit} className="mt-8 space-y-5">
            <div>
              <label className="mb-2 block text-sm font-semibold text-stone-800">Name</label>
              <Input value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} placeholder="Your name" />
            </div>
            <div>
              <label className="mb-2 block text-sm font-semibold text-stone-800">Email</label>
              <Input type="email" value={form.email} onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))} placeholder="you@example.com" required />
            </div>
            <div>
              <label className="mb-2 block text-sm font-semibold text-stone-800">Password</label>
              <Input type="password" value={form.password} onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))} placeholder="••••••••" required />
            </div>
            <div>
              <label className="mb-2 block text-sm font-semibold text-stone-800">Confirm password</label>
              <Input type="password" value={form.confirmPassword} onChange={(e) => setForm((p) => ({ ...p, confirmPassword: e.target.value }))} placeholder="••••••••" required />
            </div>

            {error ? <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div> : null}

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Creating account...' : 'Create account'}
            </Button>
          </form>
        </div>
      </div>
    </main>
  );
}
