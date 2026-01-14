"use client"
import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase/client'
import Button from '@/components/ui/Button'
import Card from '@/components/ui/Card'

type UserRow = { id: string; email: string | null; created_at?: string; plan?: string | null; expiry_date?: string | null }

const PLANS = ['basic', 'pro', 'advance']

export default function AdminUsersPage() {
  const [loading, setLoading] = useState(true)
  const [users, setUsers] = useState<UserRow[]>([])
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState<string | null>(null)
  const [editing, setEditing] = useState<Record<string, { plan?: string | null; expiry_date?: string | null }>>({})
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    let mounted = true
    
    const checkMobile = () => setIsMobile(window.innerWidth <= 768)
    checkMobile()
    window.addEventListener('resize', checkMobile)
    
    ;(async () => {
      try {
        const session = await supabase.auth.getSession()
        const token = session?.data?.session?.access_token
        const res = await fetch('/api/admin/users', { headers: token ? { Authorization: `Bearer ${token}` } : {} })
        if (!mounted) return
        if (res.ok) {
          const json = await res.json()
          setUsers(json?.data || [])
        }
      } catch (e) {
        // ignore
      } finally {
        if (mounted) setLoading(false)
      }
    })()
    return () => { mounted = false; window.removeEventListener('resize', checkMobile) }
  }, [])

  async function refreshList() {
    const session = await supabase.auth.getSession()
    const token = session?.data?.session?.access_token
    const res = await fetch('/api/admin/users', { headers: token ? { Authorization: `Bearer ${token}` } : {} })
    if (!res.ok) return
    const json = await res.json().catch(() => ({ data: [] }))
    setUsers(json.data || [])
  }

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault()
    setMessage(null)
    if (!email) {
      setMessage('Please provide an email')
      return
    }

    try {
      const session = await supabase.auth.getSession()
      const token = session?.data?.session?.access_token
      const res = await fetch('/api/admin/invite', { method: 'POST', headers: { 'content-type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: JSON.stringify({ email }) })
      if (!res.ok) {
        const json = await res.json().catch(() => ({}))
        setMessage(json?.error || 'Invite failed')
        return
      }
      setMessage('Invite sent')
      setEmail('')
      await refreshList()
    } catch (err) {
      setMessage('Network error')
    }
  }

  function startEdit(u: UserRow) {
    setEditing((s) => ({ ...s, [u.id]: { plan: u.plan ?? null, expiry_date: u.expiry_date ?? null } }))
  }

  function cancelEdit(id: string) {
    setEditing((s) => {
      const copy = { ...s }
      delete copy[id]
      return copy
    })
  }

  async function saveSubscription(id: string) {
    const payload = editing[id]
    setMessage(null)
    try {
      const session = await supabase.auth.getSession()
      const token = session?.data?.session?.access_token
      const res = await fetch('/api/admin/subscription', { method: 'POST', headers: { 'content-type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: JSON.stringify({ user_id: id, plan: payload?.plan ?? null, expiry_date: payload?.expiry_date ?? null }) })
      if (!res.ok) {
        const json = await res.json().catch(() => ({}))
        setMessage(json?.error || 'Save failed')
        return
      }
      setMessage('Saved')
      cancelEdit(id)
      await refreshList()
    } catch (err) {
      setMessage('Network error')
    }
  }

  function statusFor(u: UserRow) {
    if (!u.plan || !u.expiry_date) return 'locked'
    const exp = new Date(u.expiry_date).getTime()
    if (isNaN(exp)) return 'locked'
    return exp > Date.now() ? 'active' : 'expired'
  }

  return (
    <div className="p-6">
      <h2 className="text-xl font-semibold">Admin — Users</h2>
      <p className="text-sm text-slate-500 mb-4">Manage application users. Invite new users or view existing accounts.</p>

      <div className="grid grid-cols-1 gap-4 items-start">
        <section>
          <Card className="p-6 min-h-[24rem]">
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-lg font-medium">Users</h3>
              <div>
                <Button intent="secondary" onClick={() => refreshList()}>Refresh</Button>
              </div>
            </div>

            {loading ? (
              <div>Loading…</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm table-auto">
                  <thead>
                    <tr className="text-slate-600 text-left">
                      <th className="px-3 py-2">Email</th>
                      <th className="px-3 py-2">Created</th>
                      <th className="px-3 py-2">Plan</th>
                      <th className="px-3 py-2">Expiry</th>
                      <th className="px-3 py-2">Status</th>
                      <th className="px-3 py-2 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.length === 0 && (
                      <tr><td colSpan={6} className="px-3 py-4">No users found.</td></tr>
                    )}
                    {users.map(u => {
                      const edit = editing[u.id]
                      return (
                        <tr key={u.id} className="border-t">
                          <td className="px-3 py-3 align-top">{u.email ?? <em className="text-slate-500">(no email)</em>}</td>
                          <td className="px-3 py-3 align-top">{u.created_at ? new Date(u.created_at).toLocaleString() : '—'}</td>
                          <td className="px-3 py-3 align-top">
                            {edit ? (
                              <select className="input" value={edit.plan ?? ''} onChange={e => setEditing(s => ({ ...s, [u.id]: { ...(s[u.id] || {}), plan: e.target.value || null } }))}>
                                <option value="">(none)</option>
                                {PLANS.map(p => <option key={p} value={p}>{p}</option>)}
                              </select>
                            ) : (
                              u.plan || <em className="text-slate-500">not set</em>
                            )}
                          </td>
                          <td className="px-3 py-3 align-top">
                            {edit ? (
                              <input className="input" type="datetime-local" value={edit.expiry_date ? new Date(edit.expiry_date).toISOString().slice(0,16) : ''} onChange={e => setEditing(s => ({ ...s, [u.id]: { ...(s[u.id] || {}), expiry_date: e.target.value ? new Date(e.target.value).toISOString() : null } }))} />
                            ) : (
                              u.expiry_date ? new Date(u.expiry_date).toLocaleString() : <em className="text-slate-500">not set</em>
                            )}
                          </td>
                          <td className="px-3 py-3 align-top">
                            {statusFor(u) === 'active' && <span className="inline-flex items-center px-2 py-1 rounded-md text-xs bg-emerald-100 text-emerald-800">Active</span>}
                            {statusFor(u) === 'expired' && <span className="inline-flex items-center px-2 py-1 rounded-md text-xs bg-yellow-100 text-yellow-800">Expired</span>}
                            {statusFor(u) === 'locked' && <span className="inline-flex items-center px-2 py-1 rounded-md text-xs bg-slate-100 text-slate-700">Locked</span>}
                          </td>
                          <td className="px-3 py-3 align-top text-right">
                            {edit ? (
                              <div className="flex gap-2 justify-end">
                                <Button onClick={() => saveSubscription(u.id)}>Save</Button>
                                <Button intent="secondary" onClick={() => cancelEdit(u.id)}>Cancel</Button>
                              </div>
                            ) : (
                              <div className="flex gap-2 justify-end">
                                <Button onClick={() => startEdit(u)}>Edit</Button>
                                <Button onClick={() => { setEditing(s => ({ ...s, [u.id]: { plan: null, expiry_date: null } })); saveSubscription(u.id) }}>Lock</Button>
                              </div>
                            )}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </section>
      </div>
    </div>
  )
}

