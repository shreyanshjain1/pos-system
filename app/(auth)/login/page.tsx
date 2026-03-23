'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('admin@vertexpos.local');
  const [password, setPassword] = useState('password123');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setLoading(true);

    const result = await signIn('credentials', {
      email,
      password,
      redirect: false
    });

    setLoading(false);

    if (result?.error) {
      setError('Invalid email or password.');
      return;
    }

    router.push('/dashboard');
    router.refresh();
  }

  return (
    <main className="min-h-screen bg-stone-50">
      <div className="mx-auto grid min-h-screen max-w-6xl items-center px-6 py-12 md:grid-cols-2 md:gap-10">
        <div className="hidden md:block">
          <div className="rounded-3xl bg-gradient-to-br from-emerald-600 to-emerald-700 p-10 text-white shadow-xl">
            <div className="mb-6 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-white/15 text-2xl font-black">V</div>
            <h1 className="text-4xl font-black leading-tight">Welcome back to Vertex POS</h1>
            <p className="mt-4 text-base leading-7 text-emerald-50">
              Sign in to manage products, checkout, inventory, suppliers, and business reports.
            </p>
          </div>
        </div>

        <div className="rounded-3xl border border-stone-200 bg-white p-8 shadow-lg md:p-10">
          <h2 className="text-3xl font-black text-stone-900">Sign in</h2>
          <p className="mt-2 text-sm text-stone-500">Use the seeded demo account or your own account.</p>

          <form onSubmit={onSubmit} className="mt-8 space-y-5">
            <div>
              <label className="mb-2 block text-sm font-semibold text-stone-800">Email</label>
              <Input type="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-stone-800">Password</label>
              <Input type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} required />
            </div>

            {error ? <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div> : null}

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Signing in...' : 'Sign in'}
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-stone-600">
            Don&apos;t have an account?{' '}
            <button type="button" onClick={() => router.push('/signup')} className="font-semibold text-emerald-600 hover:text-emerald-700">
              Create one
            </button>
          </p>
        </div>
      </div>
    </main>
  );
}
