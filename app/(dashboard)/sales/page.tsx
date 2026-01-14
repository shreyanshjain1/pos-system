"use client"
import React, { useEffect, useState, useRef } from 'react'
import { fetchWithAuth } from '@/lib/fetchWithAuth'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import formatCurrency from '@/lib/format/currency'
import ReceiptPreview from '@/components/print/ReceiptPreview'
import ThermalReceipt from '@/components/print/ThermalReceipt'

type SaleItem = { id: string; product_id: string; quantity: number; price: number }
type Sale = { id: string; total: number; payment_method?: string; created_at?: string; sale_items?: SaleItem[] }

export default function SalesPage() {
  const [sales, setSales] = useState<Sale[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const [pageSize] = useState(20)
  const [count, setCount] = useState<number | null>(null)
  const [detail, setDetail] = useState<Sale | null>(null)

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
      const res = await fetchWithAuth(`/api/sales?page=${p}&pageSize=${pageSize}`, { signal: controller.signal })
      if (res.status === 401) {
        window.location.href = '/onboard'
        return
      }
      const json = await res.json()
      if (!res.ok) throw new Error(json?.error || 'Failed to load sales')
      setSales(json.data || [])
      setCount(json.count ?? null)
    } catch (err: any) {
      if (err?.name === 'AbortError') return
      setError(err?.message || 'Failed to load')
    } finally {
      setLoading(false)
      fetchControllerRef.current = null
    }
  }

  const totalPages = count ? Math.ceil(count / pageSize) : null

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-semibold">Sales</h2>
        <p className="text-sm text-slate-500">Sale history and receipts</p>
      </div>

      <Card>
        {loading ? (
          <div className="h-44 animate-pulse bg-white rounded-md" />
        ) : error ? (
          <div className="text-red-600">{error}</div>
        ) : (
          <div>
            <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-slate-600">
                  <th className="py-2 text-left">ID</th>
                  <th className="py-2 text-left">Date</th>
                  <th className="py-2 text-right">Total</th>
                  <th className="py-2 text-left">Payment</th>
                  <th className="py-2 text-right">Items</th>
                  <th className="py-2 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {sales.map(s => (
                  <tr key={s.id} className="border-t border-gray-100">
                    <td className="py-3">{s.id}</td>
                    <td className="py-3">{s.created_at ? new Date(s.created_at).toLocaleString() : ''}</td>
                    <td className="py-3 text-right">{formatCurrency(s.total)}</td>
                    <td className="py-3">{s.payment_method ?? '—'}</td>
                    <td className="py-3 text-right">{(s.sale_items || []).length}</td>
                    <td className="py-3 text-right">
                      <Button onClick={() => setDetail(s)}>View</Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>

            <div className="mt-4 flex items-center justify-between flex-wrap gap-3">
              <div className="text-sm text-slate-500">{count ? `${count} sales` : ''}</div>
              <div className="flex items-center gap-2">
                <Button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1}>Prev</Button>
                <div className="text-sm">{page}{totalPages ? ` / ${totalPages}` : ''}</div>
                <Button onClick={() => setPage(p => p + 1)} disabled={totalPages ? page >= totalPages : sales.length < pageSize}>Next</Button>
              </div>
            </div>
          </div>
        )}
      </Card>

      {detail && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="w-full max-w-2xl">
            <Card>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h3 className="text-lg font-semibold mb-3">Receipt preview</h3>
                  <ReceiptPreview
                    storeName={typeof window !== 'undefined' ? (JSON.parse(localStorage.getItem('pos:settings') || '{}')?.storeName || 'Store') : 'Store'}
                    header={typeof window !== 'undefined' ? (JSON.parse(localStorage.getItem('pos:settings') || '{}')?.receiptHeader || '') : ''}
                    footer={typeof window !== 'undefined' ? (JSON.parse(localStorage.getItem('pos:settings') || '{}')?.receiptFooter || '') : ''}
                    items={(detail.sale_items || []).map((it: any) => ({ name: it.product?.name ?? it.product_name ?? it.product_id, qty: it.quantity, price: it.price ?? 0 }))}
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
                    <ThermalReceipt sale={{ id: detail.id, created_at: detail.created_at, items: (detail.sale_items || []).map((it: any) => ({ name: it.product?.name ?? it.product_name ?? it.product_id, qty: it.quantity, price: it.price ?? 0 })), total: detail.total }} />
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
    </div>
  )
}
