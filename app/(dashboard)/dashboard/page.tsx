"use client"
import React, { useEffect, useState } from 'react'
import { fetchWithAuth } from '@/lib/fetchWithAuth'
import { Card } from '@/components/ui/Card'
import formatCurrency from '@/lib/format/currency'
import SectionErrorBoundary from '@/components/ui/SectionErrorBoundary'
import { motion } from 'framer-motion'
import { pageVariants, cardVariants, staggerContainer, listItem } from '@/lib/motion'

type Summary = {
  todaysSales: number
  transactionsToday: number
  itemsSoldToday: number
  netProfitToday: number
  totalProducts: number
  lowStock: number
  outOfStock: number
}

type PopularItem = {
  product_name: string
  product_id: string
  total_quantity: number
  total_sales: number
}

export default function DashboardPage() {
  const [data, setData] = useState<Summary | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [plan, setPlan] = useState<string | null>(null)
  const [popularItems, setPopularItems] = useState<PopularItem[]>([])
  const [popularPeriod, setPopularPeriod] = useState<'daily' | 'weekly' | 'monthly'>('daily')
  const [popularLoading, setPopularLoading] = useState(false)
  const popularEnabled = false // temporarily disable popular items until backend is stable

  useEffect(() => {
    let mounted = true
    ;(async () => {
      try {
        const res = await fetchWithAuth('/api/subscription')
        if (res.ok && mounted) {
          const sj = await res.json().catch(() => ({}))
          const planRaw = (sj?.plan ?? null)
          const planNorm = planRaw ? String(planRaw).toLowerCase() : null
          setPlan(planNorm === 'advanced' ? 'advance' : planNorm)
        } else {
          setPlan(prev => prev ?? 'pro')
        }
      } catch (_) {
        setPlan(prev => prev ?? 'pro')
      }
    })()
    return () => { mounted = false }
  }, [])

  useEffect(() => {
    let mounted = true

    async function fetchSummary() {
      setLoading(true)
      try {
        const res = await fetchWithAuth('/api/summary')
        const json: unknown = await res.json()
        if (!mounted) return
        if (!res.ok) {
          const errMsg = typeof json === 'object' && json !== null ? (json as Record<string, unknown>)['error'] : undefined
          throw new Error((errMsg as string) || 'Failed to fetch summary')
        }
        const obj = typeof json === 'object' && json !== null ? (json as Record<string, unknown>) : {}
        setData({
          todaysSales: Number(obj['todaysSales'] ?? 0),
          transactionsToday: Number(obj['transactionsToday'] ?? 0),
          itemsSoldToday: Number(obj['itemsSoldToday'] ?? 0),
          netProfitToday: Number(obj['netProfitToday'] ?? 0),
          totalProducts: Number(obj['totalProducts'] ?? 0),
          lowStock: Number(obj['lowStock'] ?? 0),
          outOfStock: Number(obj['outOfStock'] ?? 0),
        })
      } catch (err: unknown) {
        console.error(err)
        if (!mounted) return
        const msg = err instanceof Error ? err.message : String(err)
        setError(msg || 'Failed to load summary')
      } finally {
        if (mounted) setLoading(false)
      }
    }

    fetchSummary()
    return () => { mounted = false }
  }, [])

  useEffect(() => {
    if (!popularEnabled || plan !== 'advance') return
    
    let mounted = true
    async function fetchPopular() {
      setPopularLoading(true)
      try {
        const res = await fetchWithAuth(`/api/reports/popular?period=${popularPeriod}`)
        const json: unknown = await res.json()
        if (!mounted) return
        if (!res.ok) throw new Error('Failed to fetch popular items')
        const items = (json as { data?: PopularItem[] })?.data ?? []
        setPopularItems(items)
      } catch (err) {
        console.error('Failed to load popular items:', err)
      } finally {
        if (mounted) setPopularLoading(false)
      }
    }
    fetchPopular()
    return () => { mounted = false }
  }, [plan, popularPeriod, popularEnabled])

  const profitClass = data
    ? (data.netProfitToday > 0 ? 'text-emerald-600' : data.netProfitToday < 0 ? 'text-red-600' : 'text-slate-800')
    : 'text-slate-800'


  return (
    <motion.div
      variants={pageVariants}
      initial="hidden"
      animate="visible"
    >
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-stone-900 tracking-tight">Overview</h2>
        <p className="text-sm text-stone-500 mt-1">Quick summary of today&apos;s activity</p>
      </div>

      {loading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-32 rounded-2xl bg-white shadow-sm border border-stone-200 animate-pulse" />
          ))}
        </div>
      )}

      {error && (
        <motion.div 
          className="bg-red-50 border border-red-200 text-red-700 px-5 py-4 rounded-xl"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          {error}
        </motion.div>
      )}

      {!loading && data && (
        <SectionErrorBoundary section="Summary Cards">
          <motion.div 
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5"
            variants={staggerContainer}
            initial="hidden"
            animate="visible"
          >
            <StatCard
              label="Today's Sales"
              value={formatCurrency(data.todaysSales)}
              icon={<svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>}
              gradient="from-emerald-500 to-teal-600"
            />

            <StatCard
              label="Transactions Today"
              value={String(data.transactionsToday)}
              icon={<svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M3 3h18v18H3zM21 9H3M21 15H3M9 21V3M15 21V3"/></svg>}
              gradient="from-blue-500 to-indigo-600"
            />

            <StatCard
              label="Items Sold Today"
              value={String(data.itemsSoldToday)}
              icon={<svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/></svg>}
              gradient="from-purple-500 to-pink-600"
            />

            {(plan === 'pro' || plan === 'advance') && (
              <>
                <StatCard
                  label="Net Profit Today"
                  value={formatCurrency(data.netProfitToday)}
                  icon={<svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M3 3v18h18"/><path d="M7 16l4-4 4 4 6-7"/></svg>}
                  gradient={data.netProfitToday >= 0 ? "from-green-500 to-emerald-600" : "from-red-500 to-rose-600"}
                  valueClass={data.netProfitToday > 0 ? 'text-emerald-700' : data.netProfitToday < 0 ? 'text-red-700' : 'text-stone-800'}
                />

                <StatCard
                  label="Low Stock Items"
                  value={String(data.lowStock)}
                  icon={<svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M12 9v4m0 4h.01M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0z"/></svg>}
                  gradient="from-amber-500 to-orange-600"
                />

                <StatCard
                  label="Out-of-Stock Items"
                  value={String(data.outOfStock)}
                  icon={<svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M18 6L6 18M6 6l12 12"/></svg>}
                  gradient="from-slate-500 to-gray-600"
                />
              </>
            )}
          </motion.div>
        </SectionErrorBoundary>
      )}

      {/* Popular Items - Advanced Plan Only */}
      {!loading && plan === 'advance' && popularEnabled && (
        <motion.div
          className="mt-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-xl font-bold text-stone-900">Popular Items</h3>
              <p className="text-sm text-stone-500 mt-1">Best selling products by period</p>
            </div>
            <div className="flex gap-2 bg-stone-100 rounded-lg p-1">
              <button
                onClick={() => setPopularPeriod('daily')}
                className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                  popularPeriod === 'daily'
                    ? 'bg-white text-emerald-700 shadow-sm'
                    : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                Daily
              </button>
              <button
                onClick={() => setPopularPeriod('weekly')}
                className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                  popularPeriod === 'weekly'
                    ? 'bg-white text-emerald-700 shadow-sm'
                    : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                Weekly
              </button>
              <button
                onClick={() => setPopularPeriod('monthly')}
                className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                  popularPeriod === 'monthly'
                    ? 'bg-white text-emerald-700 shadow-sm'
                    : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                Monthly
              </button>
            </div>
          </div>

          <Card className="overflow-hidden">
            {popularLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
              </div>
            ) : popularItems.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-stone-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-stone-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M20 7h-4m0 0V3m0 4l3.5-3.5M6 20l-3-3m0 0h4m-4 0v4M18 20v-4m0 4h4m0 0v-4" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                <p className="text-stone-600">No sales data for this period</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-stone-50 border-b border-stone-200">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-stone-700 uppercase tracking-wider">Rank</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-stone-700 uppercase tracking-wider">Product</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-stone-700 uppercase tracking-wider">Quantity Sold</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-stone-700 uppercase tracking-wider">Total Sales</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-200">
                    {popularItems.slice(0, 10).map((item, index) => (
                      <tr key={item.product_id} className="hover:bg-stone-50 transition-colors">
                        <td className="px-6 py-4">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                            index === 0 ? 'bg-amber-100 text-amber-700' :
                            index === 1 ? 'bg-stone-200 text-stone-700' :
                            index === 2 ? 'bg-orange-100 text-orange-700' :
                            'bg-stone-100 text-stone-600'
                          }`}>
                            {index + 1}
                          </div>
                        </td>
                        <td className="px-6 py-4 font-medium text-stone-900">{item.product_name}</td>
                        <td className="px-6 py-4 text-stone-700">{item.total_quantity} units</td>
                        <td className="px-6 py-4 font-semibold text-emerald-700">{formatCurrency(item.total_sales)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </motion.div>
      )}
    </motion.div>
  )
}

type StatCardProps = {
  label: string
  value: string
  icon: React.ReactNode
  gradient: string
  valueClass?: string
}

function StatCard({ label, value, icon, gradient, valueClass = 'text-stone-900' }: StatCardProps) {
  return (
    <motion.div
      variants={listItem}
      whileHover="hover"
    >
      <motion.div
        className="bg-white rounded-2xl p-6 border border-stone-200 shadow-sm hover:shadow-md transition-shadow"
        variants={cardVariants}
      >
        <div className="flex items-start justify-between mb-4">
          <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center text-white shadow-sm`}>
            {icon}
          </div>
        </div>
        <div className="text-sm text-stone-500 font-medium mb-1">{label}</div>
        <div className={`text-3xl font-bold tracking-tight ${valueClass}`}>{value}</div>
      </motion.div>
    </motion.div>
  )
}
