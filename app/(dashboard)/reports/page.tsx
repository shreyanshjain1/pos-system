"use client"
import React, { useEffect, useState } from 'react'
import { fetchWithAuth } from '@/lib/fetchWithAuth'
import SectionErrorBoundary from '@/components/ui/SectionErrorBoundary'
import { motion } from 'framer-motion'
import { pageVariants } from '@/lib/motion'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'

type TimeseriesPoint = { t: string; total: number }

export default function ReportsPage() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [from, setFrom] = useState<string>(new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString().slice(0, 10))
  const [to, setTo] = useState<string>(new Date().toISOString().slice(0, 10))
  const [timeseries, setTimeseries] = useState<TimeseriesPoint[]>([])
  const [totals, setTotals] = useState<{ todaysSales?: number; totalProducts?: number; lowStock?: number } | null>(null)
  const [plan, setPlan] = useState<string | null>(null)

  useEffect(() => {
    ;(async () => {
      try {
        const res = await fetchWithAuth('/api/subscription')
        if (res.ok) {
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
  }, [])

  async function loadRange(f: string, t: string) {
    setLoading(true); setError(null)
    try {
      const res = await fetchWithAuth(`/api/reports/sales?from=${encodeURIComponent(f)}&to=${encodeURIComponent(t)}`)
      if (!res.ok) {
        const j = await res.json().catch(() => ({}))
        throw new Error(j?.error || 'Failed to load report')
      }
      const j = await res.json()
      setTimeseries(Array.isArray(j.timeseries) ? j.timeseries.map((p: any) => ({ t: p.t, total: Number(p.total || 0) })) : [])
      setTotals({ todaysSales: Number(j.todaysSales || 0), totalProducts: Number(j.totalProducts || 0), lowStock: Number(j.lowStock || 0) })
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e)
      setError(msg)
    } finally { setLoading(false) }
  }

  useEffect(() => { loadRange(from, to) }, [])

  function exportCsv() {
    const rows = [['date','total']]
    for (const p of timeseries) rows.push([p.t, String(p.total)])
    const csv = rows.map(r => r.map(c => '"' + String(c).replace(/"/g,'""') + '"').join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = `report_${from}_${to}.csv`; a.click()
    URL.revokeObjectURL(url)
  }

  // simple SVG sparkline
  function Sparkline({ data }: { data: TimeseriesPoint[] }) {
    const width = 300, height = 80, pad = 6
    if (!data || data.length === 0) return <div className="text-sm text-slate-500">No data</div>
    const vals = data.map(d => d.total)
    const max = Math.max(...vals)
    const min = Math.min(...vals)
    const stepX = (width - pad*2) / Math.max(1, data.length - 1)
    const points = data.map((d, i) => {
      const x = pad + i * stepX
      const y = pad + (max === min ? height/2 : (1 - (d.total - min) / (max - min)) * (height - pad*2))
      return `${x},${y}`
    }).join(' ')
    return (
      <svg width={width} height={height} className="block">
        <polyline fill="none" stroke="#10b981" strokeWidth={2} points={points} />
      </svg>
    )
  }

  return (
    <motion.div
      variants={pageVariants}
      initial="hidden"
      animate="visible"
    >
      <h2 className="text-3xl font-bold tracking-tight text-stone-900">Reports</h2>
      <p className="text-sm text-stone-500 mb-6 mt-1">Custom date-range reports, charts, and CSV export</p>

      {plan === 'basic' && (
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
            <p className="text-sm text-stone-600 mb-6">Reports and analytics are only available on Pro and Advance plans. Upgrade now to access detailed sales reports, charts, and data export.</p>
            <Button className="w-full bg-emerald-600 text-white hover:bg-emerald-700">View Plans</Button>
          </Card>
        </motion.div>
      )}

      {plan !== 'basic' && (
        <>
          <div className="flex flex-col sm:flex-wrap sm:flex-row gap-3 items-stretch sm:items-end mb-4 w-full">
            <label className="text-sm flex-1 min-w-[180px]">
              <span className="block mb-1 text-stone-600">From</span>
              <input type="date" value={from} onChange={e => setFrom(e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500" />
            </label>
            <label className="text-sm flex-1 min-w-[180px]">
              <span className="block mb-1 text-stone-600">To</span>
              <input type="date" value={to} onChange={e => setTo(e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500" />
            </label>
            <div className="flex gap-2 flex-1 sm:flex-none sm:w-auto">
              <button onClick={() => loadRange(from, to)} className="flex-1 sm:flex-none px-4 sm:px-5 py-2.5 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white rounded-xl hover:from-emerald-600 hover:to-emerald-700 font-semibold transition-all shadow-sm hover:shadow-md">
                <span className="flex items-center justify-center gap-2">
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  Run Report
                </span>
              </button>
              {plan === 'advance' ? (
                <button onClick={exportCsv} className="flex-1 sm:flex-none px-4 sm:px-5 py-2.5 bg-white rounded-xl border-2 border-stone-300 hover:border-emerald-500 hover:bg-stone-50 font-semibold transition-all shadow-sm hover:shadow-md text-stone-700">
                  <span className="flex items-center justify-center gap-2">
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    Export CSV
                  </span>
                </button>
              ) : (
                <button disabled className="flex-1 sm:flex-none px-4 sm:px-5 py-2.5 bg-stone-100 rounded-xl border-2 border-stone-200 font-semibold text-stone-400 cursor-not-allowed shadow-sm">
                  <span className="flex items-center justify-center gap-2">
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    CSV Export (Advanced Only)
                  </span>
                </button>
              )}
            </div>
          </div>

          {loading ? (
            <div>Loading…</div>
          ) : error ? (
            <div className="text-red-600">{error}</div>
          ) : (
            <SectionErrorBoundary section="Reports">
              <div className="grid grid-cols-1 gap-6">
                <div className="bg-white p-4 sm:p-6 rounded-2xl shadow-sm border border-stone-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-xs text-stone-500 font-medium uppercase tracking-wide">Sales (range)</div>
                      <div className="text-3xl font-bold text-stone-900 mt-1">{totals?.todaysSales?.toLocaleString?.() ?? '0'}</div>
                    </div>
                    <div className="-mr-2 scale-95 sm:scale-100 overflow-hidden"><Sparkline data={timeseries} /></div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                  <div className="bg-white p-4 sm:p-6 rounded-2xl shadow-sm border border-stone-200">
                    <div className="text-xs text-stone-500 font-medium uppercase tracking-wide">Total Products</div>
                    <div className="text-3xl font-bold text-stone-900 mt-2">{totals?.totalProducts ?? 0}</div>
                  </div>
                  <div className="bg-white p-4 sm:p-6 rounded-2xl shadow-sm border border-stone-200">
                    <div className="text-xs text-stone-500 font-medium uppercase tracking-wide">Low Stock Items</div>
                    <div className="text-3xl font-bold text-stone-900 mt-2">{totals?.lowStock ?? 0}</div>
                  </div>
                </div>

                <div className="bg-white p-4 sm:p-6 rounded-2xl shadow-sm border border-stone-200">
                  <h3 className="font-bold text-lg text-stone-900 mb-4">Time Series Data</h3>
                  <div className="overflow-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b-2 border-stone-200">
                          <th className="text-left py-3 px-4 font-semibold text-stone-700">Date</th>
                          <th className="text-right py-3 px-4 font-semibold text-stone-700">Total Sales</th>
                        </tr>
                      </thead>
                      <tbody>
                        {timeseries.map(p => (
                          <tr key={p.t} className="border-t border-stone-100 hover:bg-stone-50 transition-colors">
                            <td className="py-3 px-4 text-stone-900">{p.t}</td>
                            <td className="text-right py-3 px-4 font-medium text-stone-900">{p.total.toLocaleString()}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </SectionErrorBoundary>
          )}
        </>
      )}
    </motion.div>
  )
}
