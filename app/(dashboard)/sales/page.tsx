"use client"
import React, { useEffect, useState, useRef } from 'react'
import { fetchWithAuth } from '@/lib/fetchWithAuth'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import formatCurrency from '@/lib/format/currency'
import ReceiptPreview from '@/components/print/ReceiptPreview'
import ThermalReceipt from '@/components/print/ThermalReceipt'
import SectionErrorBoundary from '@/components/ui/SectionErrorBoundary'
import { motion } from 'framer-motion'
import { pageVariants, tableRowVariants } from '@/lib/motion'

type SaleItem = { id: string; product_id: string; quantity: number; price: number }
type Sale = { id: string; total: number; payment_method?: string; created_at?: string; sale_items?: SaleItem[] }

export default function SalesPage() {
  const [sales, setSales] = useState<Sale[]>([])
  const [dateFrom, setDateFrom] = useState<string>('')
  const [dateTo, setDateTo] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const [pageSize] = useState(20)
  const [count, setCount] = useState<number | null>(null)
  const [detail, setDetail] = useState<Sale | null>(null)
  const [serverTotalPayment, setServerTotalPayment] = useState<number | null>(null)
  const [serverTotalItems, setServerTotalItems] = useState<number | null>(null)

  const pollTimerRef = useRef<number | null>(null)
  const fetchControllerRef = useRef<AbortController | null>(null)

  useEffect(() => { fetchPage(page) }, [page])

  useEffect(() => {
    return () => {
      try { if (pollTimerRef.current) { window.clearInterval(pollTimerRef.current); pollTimerRef.current = null } } catch(_) {}
      try { fetchControllerRef.current?.abort() } catch (_) {}
    }
  }, [])

  async function fetchPage(p: number) {
    try { fetchControllerRef.current?.abort() } catch (_) {}
    const controller = new AbortController()
    fetchControllerRef.current = controller

    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams()
      params.set('page', String(p))
      params.set('pageSize', String(pageSize))
      if (dateFrom) params.set('from', dateFrom)
      if (dateTo) params.set('to', dateTo)
      const res = await fetchWithAuth(`/api/sales?${params.toString()}`, { signal: controller.signal })
      if (res.status === 401) {
        window.location.href = '/onboard'
        return
      }
      const json: unknown = await res.json()
      if (!res.ok) {
        const errMsg = typeof json === 'object' && json !== null ? (json as Record<string, unknown>)['error'] : undefined
        throw new Error((errMsg as string) || 'Failed to load sales')
      }
      const obj = typeof json === 'object' && json !== null ? (json as Record<string, unknown>) : {}
      setSales((obj['data'] ?? []) as Sale[])
      setCount((obj['count'] as number) ?? null)
      const totals = obj['totals'] as Record<string, unknown> | undefined
      if (totals) {
        setServerTotalPayment(Number(totals['total_payment'] ?? null) ?? null)
        setServerTotalItems(Number(totals['total_items'] ?? null) ?? null)
      } else {
        setServerTotalPayment(null)
        setServerTotalItems(null)
      }
    } catch (err: unknown) {
      if (typeof err === 'object' && err !== null && (err as { name?: unknown }).name === 'AbortError') return
      const msg = err instanceof Error ? err.message : String(err)
      setError(msg || 'Failed to load')
    } finally {
      setLoading(false)
      fetchControllerRef.current = null
    }
  }

  const totalPages = count ? Math.ceil(count / pageSize) : null

  // Totals across the currently-loaded page (server could also return totals)
  const pagePayment = sales.reduce((s, r) => s + (Number(r.total) || 0), 0)
  const pageItems = sales.reduce((s, r) => s + ((r.sale_items || []).reduce((si, it) => si + (Number((it as SaleItem).quantity) || 0), 0)), 0)
  const overallPayment = serverTotalPayment ?? pagePayment
  const overallItems = serverTotalItems ?? pageItems

  return (
    <motion.div
      variants={pageVariants}
      initial="hidden"
      animate="visible"
    >
      <div className="mb-8">
        <h2 className="text-3xl font-bold tracking-tight text-stone-900">Sales History</h2>
        <p className="text-sm text-stone-500 mt-1">View transactions and receipts</p>
      </div>

      <Card>
        <div className="mb-6 flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-stone-700">From</label>
            <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="border-2 border-stone-300 px-3 py-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-shadow" />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-stone-700">To</label>
            <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="border-2 border-stone-300 px-3 py-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-shadow" />
          </div>
          <div className="flex items-center gap-2 ml-auto">
            <button onClick={() => { setPage(1); fetchPage(1) }} className="px-4 py-2 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white rounded-xl hover:from-emerald-600 hover:to-emerald-700 font-semibold transition-all shadow-sm hover:shadow-md">
              Apply Filters
            </button>
            <button onClick={() => { setDateFrom(''); setDateTo(''); setPage(1); fetchPage(1) }} className="px-4 py-2 bg-white border-2 border-stone-300 text-stone-700 rounded-xl hover:bg-stone-50 font-semibold transition-all">
              Reset
            </button>
          </div>
        </div>

        <div className="mb-6 flex items-center gap-6">
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5 text-emerald-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <span className="text-sm text-stone-600">Total Payment:</span>
            <strong className="text-lg font-bold text-stone-900">{formatCurrency(overallPayment)}</strong>
          </div>
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5 text-blue-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <span className="text-sm text-stone-600">Total Items:</span>
            <strong className="text-lg font-bold text-stone-900">{overallItems}</strong>
          </div>
        </div>
        {loading ? (
          <div className="h-44 animate-pulse bg-white rounded-md" />
        ) : error ? (
          <div className="text-red-600">{error}</div>
        ) : (
          <SectionErrorBoundary section="Sales Table">
            <div>
              {/* Desktop/tablet: table */}
              <div className="hidden lg:block overflow-x-auto rounded-xl border border-stone-200">
                <table className="w-full text-sm">
                  <thead className="bg-stone-50">
                    <tr className="border-b-2 border-stone-200">
                      <th className="py-3 px-4 text-left font-semibold text-stone-700">ID</th>
                      <th className="py-3 px-4 text-left font-semibold text-stone-700">Date</th>
                      <th className="py-3 px-4 text-right font-semibold text-stone-700">Total</th>
                      <th className="py-3 px-4 text-left font-semibold text-stone-700">Payment</th>
                      <th className="py-3 px-4 text-right font-semibold text-stone-700">Items</th>
                      <th className="py-3 px-4 text-right font-semibold text-stone-700">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sales.map(s => (
                    <motion.tr 
                      key={s.id} 
                      className="border-t border-stone-100 hover:bg-stone-50"
                      variants={tableRowVariants}
                      initial="initial"
                      whileHover="hover"
                    >
                      <td className="py-4 px-4 font-mono text-xs text-stone-600">{s.id.slice(0, 8)}...</td>
                      <td className="py-4 px-4 text-stone-900">{s.created_at ? new Date(s.created_at).toLocaleString() : ''}</td>
                      <td className="py-4 px-4 text-right font-semibold text-stone-900">{formatCurrency(s.total)}</td>
                      <td className="py-4 px-4">
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700">
                          {s.payment_method ?? 'Cash'}
                        </span>
                      </td>
                      <td className="py-4 px-4 text-right text-stone-700">{(s.sale_items || []).length}</td>
                      <td className="py-4 px-4 text-right">
                        <button
                          onClick={() => setDetail(s)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white rounded-lg hover:from-emerald-600 hover:to-emerald-700 font-medium transition-all text-sm shadow-sm hover:shadow-md"
                        >
                          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" strokeLinecap="round" strokeLinejoin="round"/>
                            <path d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                          View
                        </button>
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile: stacked cards */}
            <div className="lg:hidden space-y-3">
              {sales.map(s => (
                <div key={s.id} className="border rounded-lg p-3 bg-white">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <div className="text-xs text-slate-500">ID</div>
                      <div className="text-sm break-words">{s.id}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs text-slate-500">Total</div>
                      <div className="font-semibold">{formatCurrency(s.total)}</div>
                    </div>
                  </div>

                  <div className="mt-2 grid grid-cols-2 gap-2 text-sm text-slate-600">
                    <div>
                      <div className="text-xs text-slate-500">Date</div>
                      <div>{s.created_at ? new Date(s.created_at).toLocaleString() : ''}</div>
                    </div>
                    <div>
                      <div className="text-xs text-slate-500">Payment</div>
                      <div>{s.payment_method ?? '—'}</div>
                    </div>
                  </div>

                  <div className="mt-3 flex items-center justify-between">
                    <div className="text-sm text-slate-600">Items: {(s.sale_items || []).length}</div>
                    <Button onClick={() => setDetail(s)}>View</Button>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-6 flex items-center justify-between flex-wrap gap-3">
              <div className="text-sm font-medium text-stone-600">{count ? `${count.toLocaleString()} total transactions` : ''}</div>
              <div className="flex items-center gap-3">
                <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1} className="px-4 py-2 bg-white border-2 border-stone-300 text-stone-700 rounded-xl hover:bg-stone-50 font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed">
                  ← Previous
                </button>
                <div className="text-sm font-semibold text-stone-900 bg-stone-100 px-4 py-2 rounded-xl">Page {page}{totalPages ? ` of ${totalPages}` : ''}</div>
                <button onClick={() => setPage(p => p + 1)} disabled={totalPages ? page >= totalPages : sales.length < pageSize} className="px-4 py-2 bg-white border-2 border-stone-300 text-stone-700 rounded-xl hover:bg-stone-50 font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed">
                  Next →
                </button>
              </div>
            </div>
            </div>
          </SectionErrorBoundary>
        )}
      </Card>

      {detail && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="w-full max-w-2xl">
            <Card>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div>
                  <h3 className="text-lg font-semibold mb-3">Receipt preview</h3>
                  <ReceiptPreview
                    storeName={typeof window !== 'undefined' ? (JSON.parse(localStorage.getItem('pos:settings') || '{}')?.storeName || 'Store') : 'Store'}
                    header={typeof window !== 'undefined' ? (JSON.parse(localStorage.getItem('pos:settings') || '{}')?.receiptHeader || '') : ''}
                    footer={typeof window !== 'undefined' ? (JSON.parse(localStorage.getItem('pos:settings') || '{}')?.receiptFooter || '') : ''}
                    items={(detail.sale_items || []).map((it: unknown) => {
                      const r = (typeof it === 'object' && it !== null) ? (it as Record<string, unknown>) : {}
                      return { name: (r['product'] && typeof r['product'] === 'object' ? ((r['product'] as Record<string, unknown>)['name']) : (r['product_name'] ?? r['product_id'])) as string, qty: Number(r['quantity'] ?? 0), price: Number(r['price'] ?? 0) }
                    })}
                    total={detail.total}
                    currency={typeof window !== 'undefined' ? (JSON.parse(localStorage.getItem('pos:settings') || '{}')?.currency || 'PHP') : 'PHP'}
                  />
                </div>

                <div>
                  <h3 className="text-lg font-semibold mb-3">Sale Details</h3>
                  <div className="mb-2"><strong>Sale:</strong> {detail.id}</div>
                  <div className="mb-2"><strong>Date:</strong> {detail.created_at ? new Date(detail.created_at).toLocaleString() : ''}</div>
                  <div className="mb-2"><strong>Payment:</strong> {detail.payment_method ?? '—'}</div>
                  <div className="mb-2"><strong>Total:</strong> {formatCurrency(detail.total)}</div>

                  <div className="mt-3">
                    <ThermalReceipt sale={{ id: detail.id, created_at: detail.created_at, items: (detail.sale_items || []).map((it: unknown) => {
                      const r = (typeof it === 'object' && it !== null) ? (it as Record<string, unknown>) : {}
                      return { name: (r['product'] && typeof r['product'] === 'object' ? ((r['product'] as Record<string, unknown>)['name']) : (r['product_name'] ?? r['product_id'])) as string, qty: Number(r['quantity'] ?? 0), price: Number(r['price'] ?? 0) }
                    }), total: detail.total }} />
                  </div>

                  <div className="mt-4 flex justify-end gap-2">
                    <Button onClick={() => setDetail(null)}>Close</Button>
                  </div>
                </div>
              </div>
            </Card>
          </div>
        </div>
      )}
    </motion.div>
  )
}
