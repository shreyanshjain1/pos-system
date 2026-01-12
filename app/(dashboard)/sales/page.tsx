"use client"
import React, { useEffect, useState, useRef } from 'react'
import supabase from '@/lib/supabase/client'
import { fetchWithAuth } from '@/lib/fetchWithAuth'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import formatCurrency from '@/lib/format/currency'

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
  const [realtimeStatus, setRealtimeStatus] = useState<'idle'|'connecting'|'connected'|'error'|'polling'>('idle')
  const [lastRealtimeAt, setLastRealtimeAt] = useState<number | null>(null)
  const pollTimerRef = useRef<number | null>(null)
  const inspectTimerRef = useRef<number | null>(null)
  const fetchControllerRef = useRef<AbortController | null>(null)

  useEffect(() => { fetchPage(page) }, [page])

  // Realtime for sales intentionally disabled — products are realtime-only.
  // Keep a lightweight effect so `page` dependency remains available for future logic.
  useEffect(() => {
    return () => {
      try { if (pollTimerRef.current) { window.clearInterval(pollTimerRef.current); pollTimerRef.current = null } } catch(_) {}
      try { if (inspectTimerRef.current) { window.clearInterval(inspectTimerRef.current); inspectTimerRef.current = null } } catch(_) {}
    }
  }, [page])

  async function fetchPage(p: number) {
    // Cancel previous inflight request to keep UI snappy
    try { fetchControllerRef.current?.abort() } catch (_) {}
    const controller = new AbortController()
    fetchControllerRef.current = controller

    setLoading(true)
    setError(null)
    try {
      const res = await fetchWithAuth(`/api/sales?page=${p}&pageSize=${pageSize}`, { signal: controller.signal })
      if (res.status === 401) {
        // No mapping or no token — send user to onboarding to create/map a shop
        window.location.href = '/onboard'
        return
      }
      const json = await res.json()
      if (!res.ok) throw new Error(json?.error || 'Failed to load sales')
      setSales(json.data || [])
      setCount(json.count ?? null)
    } catch (err: any) {
      if (err?.name === 'AbortError') {
        // abort: ignore
        return
      }
      setError(err?.message || 'Failed to load')
    } finally {
      setLoading(false)
      fetchControllerRef.current = null
    }
  }

  const totalPages = count ? Math.ceil(count / pageSize) : null

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
        <div>
          <h2 style={{ margin: 0 }}>Sales</h2>
          <p className="muted">Sale history and receipts</p>
        </div>
      </div>

      <Card>
        {loading ? (
          <div className="skeleton" style={{ height: 180 }} />
        ) : error ? (
          <div style={{ color: 'red' }}>{error}</div>
        ) : (
          <div>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={{ textAlign: 'left', padding: '8px' }}>ID</th>
                  <th style={{ textAlign: 'left', padding: '8px' }}>Date</th>
                  <th style={{ textAlign: 'right', padding: '8px' }}>Total</th>
                  <th style={{ textAlign: 'left', padding: '8px' }}>Payment</th>
                  <th style={{ textAlign: 'right', padding: '8px' }}>Items</th>
                  <th style={{ textAlign: 'right', padding: '8px' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {sales.map(s => (
                  <tr key={s.id}>
                    <td style={{ padding: '8px' }}>{s.id}</td>
                    <td style={{ padding: '8px' }}>{s.created_at ? new Date(s.created_at).toLocaleString() : ''}</td>
                    <td style={{ padding: '8px', textAlign: 'right' }}>{formatCurrency(s.total)}</td>
                    <td style={{ padding: '8px' }}>{s.payment_method ?? '—'}</td>
                    <td style={{ padding: '8px', textAlign: 'right' }}>{(s.sale_items || []).length}</td>
                    <td style={{ padding: '8px', textAlign: 'right' }}>
                      <Button onClick={() => setDetail(s)}>View</Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 12 }}>
              <div className="muted">{count ? `${count} sales` : ''}</div>
              <div style={{ display: 'flex', gap: 8 }}>
                <Button onClick={() => {
                  // clear polling when user navigates pages to avoid racing fetches
                  try { if (pollTimerRef.current) { window.clearInterval(pollTimerRef.current); pollTimerRef.current = null; setRealtimeStatus('connected') } } catch(_){}
                  setPage(p => Math.max(1, p - 1))
                }} disabled={page <= 1}>Prev</Button>
                <div style={{ alignSelf: 'center' }}>{page}{totalPages ? ` / ${totalPages}` : ''}</div>
                <Button onClick={() => {
                  try { if (pollTimerRef.current) { window.clearInterval(pollTimerRef.current); pollTimerRef.current = null; setRealtimeStatus('connected') } } catch(_){}
                  setPage(p => p + 1)
                }} disabled={totalPages ? page >= totalPages : sales.length < pageSize}>Next</Button>
              </div>
            </div>
          </div>
        )}
      </Card>

      {detail && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 60 }}>
          <div style={{ width: 640 }}>
            <Card>
              <h3 style={{ marginTop: 0 }}>Sale Details</h3>
              <div style={{ marginBottom: 8 }}><strong>Sale:</strong> {detail.id}</div>
              <div style={{ marginBottom: 8 }}><strong>Date:</strong> {detail.created_at ? new Date(detail.created_at).toLocaleString() : ''}</div>
              <div style={{ marginBottom: 8 }}><strong>Payment:</strong> {detail.payment_method ?? '—'}</div>
              <div style={{ marginBottom: 8 }}><strong>Total:</strong> {formatCurrency(detail.total)}</div>
              <hr />
              <div style={{ maxHeight: '50vh', overflow: 'auto', marginTop: 8 }}>
                {(detail.sale_items || []).map((it: any) => (
                  <div key={it.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0' }}>
                    <div>{it.product?.name ?? it.product_name ?? it.product_id}</div>
                    <div className="muted">{it.quantity} × {formatCurrency(it.price ?? 0)}</div>
                  </div>
                ))}
              </div>
              <div style={{ marginTop: 12, display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                 <Button onClick={() => setDetail(null)}>Close</Button>
              </div>
            </Card>
          </div>
        </div>
      )}
    </div>
  )
}
