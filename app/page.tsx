import Link from 'next/link';
import { auth } from '@/auth';
import { redirect } from 'next/navigation';

export default async function HomePage() {
  const session = await auth();
  if (session?.user?.id) {
    redirect('/dashboard');
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-stone-50 via-white to-stone-100">
      <section className="mx-auto flex min-h-screen max-w-7xl flex-col justify-center px-6 py-16">
        <div className="mb-5 inline-flex w-fit rounded-full border border-emerald-200 bg-emerald-50 px-4 py-1.5 text-sm font-semibold text-emerald-700">
          Complete POS rebuild baseline
        </div>

        <h1 className="max-w-5xl text-5xl font-black leading-tight tracking-tight text-stone-900 md:text-7xl">
          Vertex POS
        </h1>

        <p className="mt-6 max-w-3xl text-lg leading-8 text-stone-600">
          A cleaner, stronger, and more portfolio-worthy POS system with shop onboarding, products,
          checkout, suppliers, purchases, reporting, low-stock notifications, and a worker layer.
        </p>

        <div className="mt-10 flex flex-wrap gap-4">
          <Link
            href="/signup"
            className="inline-flex items-center justify-center rounded-xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700"
          >
            Create account
          </Link>
          <Link
            href="/login"
            className="inline-flex items-center justify-center rounded-xl border border-stone-300 bg-white px-5 py-3 text-sm font-semibold text-stone-900 shadow-sm transition hover:bg-stone-50"
          >
            Sign in
          </Link>
        </div>

        <div className="mt-16 grid gap-5 md:grid-cols-4">
          {[
            ['Dashboard', 'KPIs, notifications, revenue, and activity visibility.'],
            ['Products', 'Categories, stock levels, price management, and reorder points.'],
            ['Checkout', 'Fast cart flow with stock deduction and sales creation.'],
            ['Worker', 'Low-stock scan and daily summary jobs.']
          ].map(([title, body]) => (
            <div key={title} className="rounded-3xl border border-stone-200 bg-white p-6 shadow-sm">
              <div className="text-lg font-black text-stone-900">{title}</div>
              <p className="mt-2 text-sm leading-6 text-stone-600">{body}</p>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
