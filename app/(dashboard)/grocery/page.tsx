"use client"
import React, { useEffect, useState, useCallback } from 'react'
import fetchWithAuth from '@/lib/fetchWithAuth'
import { cacheProductsList, getCachedProductsList } from '@/lib/offlineQueue'
import { useOnline } from '@/components/context/OnlineContext'
import { motion } from 'framer-motion'
import { pageVariants, tableRowVariants, transitions } from '@/lib/motion'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'

export default function GroceryPage() {
  const { isOnline } = useOnline()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [products, setProducts] = useState<Array<Record<string, any>>>([])
  const [plan, setPlan] = useState<string | null>(null)
  const [subscriptionActive, setSubscriptionActive] = useState<boolean>(true)

  useEffect(() => {
    ;(async () => {
      try {
        const res = await fetchWithAuth('/api/subscription')
        if (res.ok) {
          const sj = await res.json().catch(() => ({}))
          const planRaw = (sj?.plan ?? null)
          const planNorm = planRaw ? String(planRaw).toLowerCase() : null
          setPlan(planNorm === 'advanced' ? 'advance' : planNorm)
          setSubscriptionActive(Boolean(sj?.active ?? true))
        } else {
          setPlan(prev => prev ?? 'pro')
          setSubscriptionActive(true)
        }
      } catch (_) {
        setPlan(prev => prev ?? 'pro')
        setSubscriptionActive(true)
      }
    })()
  }, [])

  const fetchProducts = useCallback(async () => {
    setLoading(true)
    setError(null)

    // If offline and not basic, serve cached
    const planIsBasic = (plan === 'basic')
    if (!isOnline && !planIsBasic) {
      const cached = await getCachedProductsList()
      if (cached.length > 0) {
        setProducts(cached)
        setLoading(false)
        return
      }
    }

    try {
      const resp = await fetchWithAuth('/api/products')
      if (!resp.ok) {
        if (resp.status === 403) setError('Access denied — your subscription may not include this feature.')
        else setError(`Failed to load products: ${resp.status}`)
        setProducts([])
        setLoading(false)
        return
      }
      const payload = await resp.json()
      const data = payload?.data ?? []
      const list = Array.isArray(data) ? data : []
      setProducts(list)
      cacheProductsList(list).catch(() => {})
    } catch (e: any) {
      const cached = await getCachedProductsList()
      if (cached.length > 0 && !planIsBasic) {
        setProducts(cached)
        setError('Offline. Showing cached list.')
      } else {
        setError(e?.message || 'Unexpected error')
        setProducts([])
      }
    } finally {
      setLoading(false)
    }
  }, [isOnline, plan])

  useEffect(() => { fetchProducts() }, [fetchProducts])

  const computeNeeded = (p: Record<string, any>) => {
    const stock = Number(p.stock ?? 0)
    const maxStockRaw = p.max_stock
    const maxStock = maxStockRaw === null || maxStockRaw === undefined ? null : Number(maxStockRaw)
    if (maxStock === null || isNaN(maxStock)) return 0
    const needed = Math.max(0, maxStock - stock)
    return needed
  }

  const planIsBasic = plan === 'basic'
  const showCached = !isOnline && products.length > 0 && !planIsBasic

  return (
    <motion.div 
      className="max-w-6xl mx-auto"
      variants={pageVariants}
      initial="hidden"
      animate="visible"
    >
      <div className="mb-8">
        <h2 className="text-3xl font-bold tracking-tight text-stone-900">Things to Buy</h2>
        <p className="text-sm text-stone-500 mt-1">See items below their target stock. Works offline on Pro/Advance plans.</p>
      </div>

      {planIsBasic && (
        <motion.div 
          className="min-h-[300px] flex items-center justify-center"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
        >
          <Card className="max-w-md p-8 text-center">
            <div className="w-16 h-16 rounded-full bg-amber-100 flex items-center justify-center mx-auto mb-6">
              <svg className="w-8 h-8 text-amber-600" viewBox="0 0 24 24" fill="none"><path d="M12 9v2m0 4v2m8.228-10.228A8 8 0 1 0 3.772 3.772a8 8 0 0 0 11.456 11.456z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </div>
            <h3 className="text-xl font-bold text-stone-900 mb-2">Upgrade to Pro or Advance</h3>
            <p className="text-sm text-stone-600 mb-6">Things to Buy is only available on Pro and Advance plans. Upgrade now to manage your inventory targets and get offline support.</p>
            <Button className="w-full bg-emerald-600 text-white hover:bg-emerald-700">View Plans</Button>
          </Card>
        </motion.div>
      )}

      {!planIsBasic && (
        <>
      {!subscriptionActive && (
        <motion.div 
          className="mb-6 bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <svg className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" viewBox="0 0 24 24" fill="none"><path d="M12 9v2m0 4v2m8.228-10.228A8 8 0 1 0 3.772 3.772a8 8 0 0 0 11.456 11.456z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
          <div>
            <p className="text-sm font-medium text-amber-900">Subscription inactive</p>
            <p className="text-xs text-amber-700 mt-0.5">Some data may be limited.</p>
          </div>
        </motion.div>
      )}

      {!subscriptionActive && (
        <motion.div 
          className="mb-6 bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <svg className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" viewBox="0 0 24 24" fill="none"><path d="M12 9v2m0 4v2m8.228-10.228A8 8 0 1 0 3.772 3.772a8 8 0 0 0 11.456 11.456z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
          <div>
            <p className="text-sm font-medium text-amber-900">Subscription inactive</p>
            <p className="text-xs text-amber-700 mt-0.5">Some data may be limited.</p>
          </div>
        </motion.div>
      )}

      <Card className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-semibold text-stone-900">Products</h3>
            <p className="text-sm text-stone-500 mt-1">{products.length} items with reorder targets</p>
          </div>
          <motion.button 
            onClick={fetchProducts} 
            disabled={loading}
            className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-xl text-sm font-medium hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <svg className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} viewBox="0 0 24 24" fill="none"><path d="M1 4v6h6M23 20v-6h-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 0 1 3.51 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
            {loading ? 'Refreshing…' : 'Refresh'}
          </motion.button>
        </div>

        {showCached && (
          <motion.div 
            className="mb-4 bg-emerald-50 border border-emerald-200 rounded-lg p-3 text-xs text-emerald-700"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            Offline mode — showing cached items.
          </motion.div>
        )}

        {!isOnline && !showCached && (
          <motion.div 
            className="mb-4 bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-700"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            Offline mode — some actions are limited.
          </motion.div>
        )}

        {error && (
          <motion.div 
            className="mb-4 bg-red-50 border border-red-200 rounded-lg p-3 text-xs text-red-700"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            {error}
          </motion.div>
        )}

        {loading ? (
          <div className="h-32 animate-pulse bg-stone-200 rounded-lg" />
        ) : !error && products.length === 0 ? (
          <div className="text-center py-12">
            <svg className="w-12 h-12 text-stone-300 mx-auto mb-3" viewBox="0 0 24 24" fill="none"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
            <p className="text-sm text-stone-500">No products found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-stone-200">
                  <th className="text-left py-3 px-4 text-stone-600 font-medium">Product</th>
                  <th className="text-right py-3 px-4 text-stone-600 font-medium">Current Stock</th>
                  <th className="text-right py-3 px-4 text-stone-600 font-medium">Target Stock</th>
                  <th className="text-right py-3 px-4 text-stone-600 font-medium">To Order</th>
                </tr>
              </thead>
              <tbody>
                {products.map((p) => {
                  const needed = computeNeeded(p)
                  const isLow = needed > 0
                  return (
                    <motion.tr 
                      key={p.id} 
                      className="border-t border-stone-200"
                      variants={tableRowVariants}
                      initial="initial"
                      whileHover="hover"
                    >
                      <td className="py-4 px-4 font-medium text-stone-900">{p.name}</td>
                      <td className="text-right py-4 px-4 text-stone-600">{p.stock ?? 0}</td>
                      <td className="text-right py-4 px-4 text-stone-600">{p.max_stock ?? '—'}</td>
                      <td className={`text-right py-4 px-4 font-semibold ${isLow ? 'text-amber-600' : 'text-emerald-600'}`}>{needed}</td>
                    </motion.tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
        </>
      )}
    </motion.div>
  )
}
