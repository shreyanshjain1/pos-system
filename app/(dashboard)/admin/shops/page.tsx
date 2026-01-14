"use client"
import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase/client'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'

type ShopRow = { id: string; name?: string | null; owner_user_id: string; owner_email?: string | null; bir_disclaimer_accepted_at?: string | null; bir_disclaimer_approved_at?: string | null }

export default function AdminShopsPage() {
  const [loading, setLoading] = useState(true)
  const [shops, setShops] = useState<ShopRow[]>([])
  const [message, setMessage] = useState<string | null>(null)

  useEffect(() => { refreshList() }, [])

  async function refreshList() {
    setLoading(true)
    setMessage(null)
    try {
      const session = await supabase.auth.getSession()
      const token = session?.data?.session?.access_token
      const res = await fetch('/api/admin/shops', { headers: token ? { Authorization: `Bearer ${token}` } : {} })
      if (!res.ok) {
        setMessage('Failed to load shops')
        setLoading(false)
        return
      }
      const json = await res.json().catch(() => ({ data: [] }))
      setShops(json.data || [])
    } catch (e) {
      setMessage('Network error')
    } finally { setLoading(false) }
  }

  async function approve(s: ShopRow) {
    if (!confirm(`Approve BIR activation for shop ${s.name || s.id}?`)) return
    setMessage(null)
    try {
      const session = await supabase.auth.getSession()
      const token = session?.data?.session?.access_token
      const res = await fetch('/api/admin/shops/approve', { method: 'POST', headers: { 'content-type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: JSON.stringify({ id: s.id }) })
      if (!res.ok) {
        const json = await res.json().catch(() => ({}))
        setMessage(json?.error || 'Approve failed')
        return
      }
      setMessage('Approved')
      await refreshList()
    } catch (e) { setMessage('Network error') }
  }

  return (
    <div className="p-6">
      <h2 className="text-xl font-semibold">Admin — Shops</h2>
      <p className="text-sm text-slate-500 mb-4">Review shop BIR acceptance records and approve activation for POS.</p>

      <Card className="p-6 min-h-[18rem]">
        {message && <div className={`mb-3 ${message?.toLowerCase()?.includes('approved') ? 'text-emerald-700' : 'text-rose-600'}`}>{message}</div>}
        {loading ? (
          <div>Loading…</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm table-auto">
              <thead>
                <tr className="text-slate-600 text-left">
                  <th className="px-3 py-2">Shop</th>
                  <th className="px-3 py-2">Owner</th>
                  <th className="px-3 py-2">Accepted</th>
                  <th className="px-3 py-2">Approved</th>
                  <th className="px-3 py-2 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {shops.length === 0 && <tr><td colSpan={5} className="px-3 py-4">No shops found.</td></tr>}
                {shops.map(s => (
                  <tr key={s.id} className="border-t">
                    <td className="px-3 py-3 align-top">{s.name || s.id}</td>
                    <td className="px-3 py-3 align-top">{s.owner_email || s.owner_user_id}</td>
                    <td className="px-3 py-3 align-top">{s.bir_disclaimer_accepted_at ? new Date(s.bir_disclaimer_accepted_at).toLocaleString() : '—'}</td>
                    <td className="px-3 py-3 align-top">{s.bir_disclaimer_approved_at ? new Date(s.bir_disclaimer_approved_at).toLocaleString() : <em className="text-slate-500">pending</em>}</td>
                    <td className="px-3 py-3 align-top text-right">
                      <div className="flex gap-2 justify-end">
                        {s.bir_disclaimer_approved_at ? (
                          <Button intent="secondary" disabled>Approved</Button>
                        ) : (
                          <Button onClick={() => approve(s)}>Approve</Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <p className="mt-4"><Link href="/admin" className="text-emerald-600">← Back to Admin</Link></p>
    </div>
  )
}
