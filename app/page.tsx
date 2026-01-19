"use client";
import Link from 'next/link'
import Button from '@/components/ui/Button'
import { motion } from 'framer-motion'
import { pageVariants, staggerContainer, listItem, transitions } from '@/lib/motion'

export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-stone-50 via-stone-50 to-stone-100 flex flex-col">
      <header className="max-w-6xl w-full mx-auto px-6 py-6 flex items-center justify-between backdrop-blur-sm">
        <motion.div 
          className="text-2xl font-extrabold"
          whileHover={{ scale: 1.05 }}
        >
          <span className="bg-gradient-to-r from-emerald-600 to-emerald-700 bg-clip-text text-transparent">RNL POS</span>
        </motion.div>
        <nav className="flex items-center gap-3">
          <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
            <Link href="/demo" className="text-sm text-stone-700 hover:text-emerald-600 transition-colors font-medium">Demo</Link>
          </motion.div>
          <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
            <Link href="/signup">
              <Button className="ml-2 bg-emerald-600 text-white shadow-md hover:bg-emerald-700">Get started</Button>
            </Link>
          </motion.div>
          <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
            <Link href="/login" className="ml-2 text-sm text-emerald-600 bg-white/80 px-4 py-2 rounded-xl border border-stone-200 font-semibold hover:shadow-md transition-all">Sign in</Link>
          </motion.div>
        </nav>
      </header>
      <section className="flex-1 flex items-center py-12">
        <motion.div 
          className="max-w-6xl mx-auto w-full px-6 grid lg:grid-cols-2 gap-12 items-center"
          variants={staggerContainer}
          initial="hidden"
          animate="visible"
        >
          <motion.div className="space-y-6">
            <motion.div variants={listItem}>
              <div className="inline-flex items-center gap-2 bg-emerald-50 text-emerald-700 px-3 py-1 rounded-full font-semibold text-sm w-max">New — Fast setup</div>
            </motion.div>

            <motion.h1 variants={listItem} className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-stone-900 leading-tight">Sell faster. Delight customers. Grow your shop.</motion.h1>

            <motion.p variants={listItem} className="text-lg text-stone-600 max-w-xl">A modern, lightweight point-of-sale for small shops — lightning-fast checkout, elegant receipts, inventory that just works, and smooth hardware support.</motion.p>

            <motion.div className="flex flex-wrap items-center gap-4" variants={listItem}>
              <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                <Link href="/signup">
                  <Button className="bg-emerald-600 text-white shadow-xl px-6 py-3 hover:bg-emerald-700">Start free — no card</Button>
                </Link>
              </motion.div>
              <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                <Link href="/demo">
                  <Button variant="secondary">Try the demo</Button>
                </Link>
              </motion.div>
            </motion.div>

            <motion.div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-6" variants={staggerContainer}>
              <motion.div variants={listItem} className="bg-white p-5 rounded-xl shadow-sm border border-stone-200 hover:shadow-md transition-shadow">
                <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center mb-3 text-lg">⚡</div>
                <h4 className="font-semibold text-stone-900">Fast Checkout</h4>
                <p className="text-sm text-stone-600 mt-1">Keyboard-first UI, barcode scanning and thermal integration.</p>
              </motion.div>
              <motion.div variants={listItem} className="bg-white p-5 rounded-xl shadow-sm border border-stone-200 hover:shadow-md transition-shadow">
                <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center mb-3 text-lg">📦</div>
                <h4 className="font-semibold text-stone-900">Inventory</h4>
                <p className="text-sm text-stone-600 mt-1">Products, categories, quick search and stock control.</p>
              </motion.div>
              <motion.div variants={listItem} className="bg-white p-5 rounded-xl shadow-sm border border-stone-200 hover:shadow-md transition-shadow">
                <div className="w-10 h-10 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center mb-3 text-lg">🏢</div>
                <h4 className="font-semibold text-stone-900">Multi-store</h4>
                <p className="text-sm text-stone-600 mt-1">Shop-scoped data and permissions for secure separation.</p>
              </motion.div>
            </motion.div>
          </motion.div>

          <motion.div className="w-full flex justify-end">
            <motion.div 
              className="relative w-full max-w-md"
              initial={{ opacity: 0, x: 40 }}
              animate={{ opacity: 1, x: 0 }}
              transition={transitions.standard}
            >
              <div aria-hidden className="absolute -left-10 -top-10 w-64 h-64 rounded-[40%] bg-gradient-to-tr from-emerald-400 via-emerald-500 to-emerald-600 opacity-60 blur-3xl transform -rotate-12" />

              <motion.div 
                className="relative z-10 bg-white rounded-2xl shadow-2xl border border-stone-200 overflow-hidden"
                whileHover={{ y: -8 }}
              >
                <div className="p-6 bg-gradient-to-br from-emerald-600 to-emerald-700 text-white">
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="text-xs opacity-90">Checkout preview</p>
                      <p className="text-2xl font-bold mt-1">Quick sale — ₱12.50</p>
                    </div>
                    <div className="text-right text-sm">
                      <p className="opacity-90">Receipt</p>
                      <p className="font-semibold">Thermal • A7</p>
                    </div>
                  </div>
                </div>

                <div className="p-5 bg-stone-50">
                    <div className="space-y-3 text-stone-700">
                    <div className="flex justify-between"><span>Blue T‑shirt</span><span>₱8.00</span></div>
                    <div className="flex justify-between"><span>Plastic Bag</span><span>₱0.50</span></div>
                    <div className="border-t mt-3 pt-3 flex justify-between font-bold text-stone-900"><span>Total</span><span>₱12.50</span></div>
                  </div>
                </div>
              </motion.div>

              <motion.div 
                className="mt-3 text-sm text-stone-500 text-right"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
              >
                No hardware? Try the demo to experience the flow.
              </motion.div>
            </motion.div>
          </motion.div>
        </motion.div>
      </section>

      <section className="py-16 border-t border-stone-200">
        <motion.div 
          className="max-w-6xl mx-auto px-6"
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
        >
          <motion.div variants={listItem} className="mb-8">
            <h2 className="text-3xl font-bold text-stone-900">Built for small shops</h2>
            <p className="text-base text-stone-600 mt-2">Everything you need to run a modern, reliable retail checkout.</p>
          </motion.div>

          <motion.div className="grid grid-cols-1 md:grid-cols-3 gap-6" variants={staggerContainer}>
            <motion.div variants={listItem} className="p-6 bg-white rounded-xl shadow-sm border border-stone-200 hover:shadow-md hover:border-emerald-300 transition-all group">
              <div className="w-12 h-12 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center mb-4 text-xl group-hover:scale-110 transition-transform">💰</div>
              <h4 className="font-semibold text-stone-900 mb-2">Simple pricing</h4>
              <p className="text-sm text-stone-600">Transparent, affordable plans — start free and scale up.</p>
            </motion.div>
            <motion.div variants={listItem} className="p-6 bg-white rounded-xl shadow-sm border border-stone-200 hover:shadow-md hover:border-emerald-300 transition-all group">
              <div className="w-12 h-12 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center mb-4 text-xl group-hover:scale-110 transition-transform">🚀</div>
              <h4 className="font-semibold text-stone-900 mb-2">Fast onboarding</h4>
              <p className="text-sm text-stone-600">Guided setup and demo data to get you selling quickly.</p>
            </motion.div>
            <motion.div variants={listItem} className="p-6 bg-white rounded-xl shadow-sm border border-stone-200 hover:shadow-md hover:border-emerald-300 transition-all group">
              <div className="w-12 h-12 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center mb-4 text-xl group-hover:scale-110 transition-transform">🤝</div>
              <h4 className="font-semibold text-stone-900 mb-2">Reliable support</h4>
              <p className="text-sm text-stone-600">Help with hardware, migration, and day-to-day operations.</p>
            </motion.div>
          </motion.div>
        </motion.div>
      </section>
    </main>
  )
}
