"use client";
import Link from 'next/link'
import Button from '@/components/ui/Button'
import { motion } from 'framer-motion'

export default function Home() {
  return (
    <main className="min-h-[calc(100vh-64px)] bg-gradient-to-b from-white via-slate-50 to-slate-100 flex flex-col">
      <header className="max-w-6xl w-full mx-auto px-6 py-6 flex items-center justify-between">
        <div className="text-2xl font-extrabold text-indigo-700">Shoply</div>
        <nav className="flex items-center gap-3">
          <Link href="/demo" className="text-sm text-gray-700 hover:text-indigo-700">Demo</Link>
          <Link href="/signup">
            <Button className="ml-2 bg-emerald-600 text-white shadow-md hover:bg-emerald-700">Get started</Button>
          </Link>
          <Link href="/login" className="ml-2 text-sm text-indigo-700 bg-white/95 px-3 py-2 rounded-full border border-gray-200 font-semibold hover:shadow">Sign in</Link>
        </nav>
      </header>
      <section className="flex-1 flex items-center">
        <div className="max-w-6xl mx-auto w-full px-6 grid lg:grid-cols-2 gap-12 items-center">
          <motion.div
            className="space-y-6"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.25 }}
            transition={{ staggerChildren: 0.08 }}
            variants={{
              hidden: {},
              visible: {},
            }}
          >
            <motion.div variants={{ hidden: { opacity: 0, y: 8 }, visible: { opacity: 1, y: 0 } }} transition={{ duration: 0.5 }}>
              <div className="inline-flex items-center gap-2 bg-indigo-50 text-indigo-700 px-3 py-1 rounded-full font-semibold text-sm w-max">New — Fast setup</div>
            </motion.div>

            <motion.h1 variants={{ hidden: { opacity: 0, y: 14 }, visible: { opacity: 1, y: 0 } }} transition={{ duration: 0.6 }} className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-slate-900 leading-tight">Sell faster. Delight customers. Grow your shop.</motion.h1>

            <motion.p variants={{ hidden: { opacity: 0, y: 10 }, visible: { opacity: 1, y: 0 } }} transition={{ duration: 0.5 }} className="text-lg text-gray-600 max-w-xl">A modern, lightweight point-of-sale for small shops — lightning-fast checkout, elegant receipts, inventory that just works, and smooth hardware support.</motion.p>

            <motion.div className="flex flex-wrap items-center gap-4" variants={{ hidden: { opacity: 0, y: 8 }, visible: { opacity: 1, y: 0 } }} transition={{ duration: 0.5 }}>
              <Link href="/signup">
                <Button className="bg-indigo-700 text-white shadow-xl px-6 py-3 hover:bg-indigo-800">Start free — no card</Button>
              </Link>
              <Link href="/demo">
                <Button variant="secondary">Try the demo</Button>
              </Link>
            </motion.div>

            <motion.div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-6">
              <motion.div variants={{ hidden: { opacity: 0, y: 6 }, visible: { opacity: 1, y: 0 } }} transition={{ duration: 0.45 }} className="bg-white/70 backdrop-blur-sm p-4 rounded-2xl shadow border border-white/60">
                <h4 className="font-semibold text-slate-900">Fast Checkout</h4>
                <p className="text-sm text-gray-600">Keyboard-first UI, barcode scanning and thermal integration.</p>
              </motion.div>
              <motion.div variants={{ hidden: { opacity: 0, y: 6 }, visible: { opacity: 1, y: 0 } }} transition={{ duration: 0.5, delay: 0.05 }} className="bg-white/70 backdrop-blur-sm p-4 rounded-2xl shadow border border-white/60">
                <h4 className="font-semibold text-slate-900">Inventory</h4>
                <p className="text-sm text-gray-600">Products, categories, quick search and stock control.</p>
              </motion.div>
              <motion.div variants={{ hidden: { opacity: 0, y: 6 }, visible: { opacity: 1, y: 0 } }} transition={{ duration: 0.55, delay: 0.1 }} className="bg-white/70 backdrop-blur-sm p-4 rounded-2xl shadow border border-white/60">
                <h4 className="font-semibold text-slate-900">Multi-store</h4>
                <p className="text-sm text-gray-600">Shop-scoped data and permissions for secure separation.</p>
              </motion.div>
            </motion.div>
          </motion.div>

          <div className="w-full flex justify-end">
            <div className="relative w-full max-w-md">
              <div aria-hidden className="absolute -left-10 -top-10 w-64 h-64 rounded-[40%] bg-gradient-to-tr from-purple-400 via-indigo-600 to-emerald-400 opacity-70 blur-3xl transform -rotate-12" />

              <div className="relative z-10 bg-white rounded-3xl shadow-2xl border border-gray-100 overflow-hidden">
                <div className="p-6 bg-gradient-to-br from-indigo-600 to-purple-500 text-white">
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="text-xs opacity-90">Checkout preview</p>
                      <p className="text-2xl font-bold mt-1">Quick sale — £12.50</p>
                    </div>
                    <div className="text-right text-sm">
                      <p className="opacity-90">Receipt</p>
                      <p className="font-semibold">Thermal • A7</p>
                    </div>
                  </div>
                </div>

                <div className="p-5 bg-white">
                  <div className="space-y-3 text-slate-700">
                    <div className="flex justify-between"><span>Blue T‑shirt</span><span>£8.00</span></div>
                    <div className="flex justify-between"><span>Plastic Bag</span><span>£0.50</span></div>
                    <div className="border-t mt-3 pt-3 flex justify-between font-bold text-slate-900"><span>Total</span><span>£12.50</span></div>
                  </div>
                </div>
              </div>

              <div className="mt-3 text-sm text-gray-500 text-right">No hardware? Try the demo to experience the flow.</div>
            </div>
          </div>
        </div>
      </section>

      <section className="py-12">
        <div className="max-w-6xl mx-auto px-6">
          <h2 className="text-2xl font-bold text-slate-900">Built for small shops</h2>
          <p className="text-sm text-gray-600 mt-2">Everything you need to run a modern, reliable retail checkout.</p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
            <div className="p-6 bg-white rounded-2xl shadow-sm border">
              <h4 className="font-semibold mb-2">Simple pricing</h4>
              <p className="text-sm text-gray-600">Transparent, affordable plans — start free and scale up.</p>
            </div>
            <div className="p-6 bg-white rounded-2xl shadow-sm border">
              <h4 className="font-semibold mb-2">Fast onboarding</h4>
              <p className="text-sm text-gray-600">Guided setup and demo data to get you selling quickly.</p>
            </div>
            <div className="p-6 bg-white rounded-2xl shadow-sm border">
              <h4 className="font-semibold mb-2">Reliable support</h4>
              <p className="text-sm text-gray-600">Help with hardware, migration, and day-to-day operations.</p>
            </div>
          </div>
        </div>
      </section>
    </main>
  )
}
