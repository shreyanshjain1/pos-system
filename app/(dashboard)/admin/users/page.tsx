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

  useEffect(() => {
    let mounted = true
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
    return () => { mounted = false }
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
    <div style={{ padding: 20 }}>
      <h2 style={{ fontSize: 20, fontWeight: 700 }}>Admin — Users</h2>
      <p style={{ marginBottom: 12 }}>Manage application users. Invite new users or view existing accounts.</p>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: 16, alignItems: 'start' }}>
        <section>
          <Card>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <h3 style={{ margin: 0 }}>Users</h3>
              <div>
                <Button className="secondary" onClick={() => refreshList()}>Refresh</Button>
              </div>
            </div>

            {loading ? (
              <div>Loading…</div>
            ) : (
              <table className="users-table">
                <thead>
                  <tr>
                    <th>Email</th>
                    <th>Created</th>
                    <th>Plan</th>
                    <th>Expiry</th>
                    <th>Status</th>
                    <th style={{ width: 180 }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.length === 0 && (
                    <tr><td colSpan={6} style={{ padding: 12 }}>No users found.</td></tr>
                  )}
                  {users.map(u => {
                    const edit = editing[u.id]
                    return (
                      <tr key={u.id}>
                        <td>
                          <div className="user-email">{u.email ?? <em>(no email)</em>}</div>
                        </td>
                        <td><div className="user-created">{u.created_at ? new Date(u.created_at).toLocaleString() : '—'}</div></td>
                        <td>
                          {edit ? (
                            <select value={edit.plan ?? ''} onChange={e => setEditing(s => ({ ...s, [u.id]: { ...(s[u.id] || {}), plan: e.target.value || null } }))}>
                              <option value="">(none)</option>
                              {PLANS.map(p => <option key={p} value={p}>{p}</option>)}
                            </select>
                          ) : (
                            u.plan || <em>not set</em>
                          )}
                        </td>
                        <td>
                          {edit ? (
                            <input type="datetime-local" value={edit.expiry_date ? new Date(edit.expiry_date).toISOString().slice(0,16) : ''} onChange={e => setEditing(s => ({ ...s, [u.id]: { ...(s[u.id] || {}), expiry_date: e.target.value ? new Date(e.target.value).toISOString() : null } }))} />
                          ) : (
                            u.expiry_date ? new Date(u.expiry_date).toLocaleString() : <em>not set</em>
                          )}
                        </td>
                        <td>
                          {statusFor(u) === 'active' && <span className="badge active">Active</span>}
                          {statusFor(u) === 'expired' && <span className="badge expired">Expired</span>}
                          {statusFor(u) === 'locked' && <span className="badge locked">Locked</span>}
                        </td>
                        <td>
                          {edit ? (
                            <div style={{ display: 'flex', gap: 8 }}>
                              <Button onClick={() => saveSubscription(u.id)}>Save</Button>
                              <Button className="secondary" onClick={() => cancelEdit(u.id)}>Cancel</Button>
                            </div>
                          ) : (
                            <div style={{ display: 'flex', gap: 8 }}>
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
            )}
          </Card>
        </section>

        <aside>
          <Card>
            <h3 style={{ margin: 0, marginBottom: 12 }}>Invite user</h3>
            <form onSubmit={handleInvite} style={{ display: 'grid', gap: 8, marginTop: 8 }}>
              <label style={{ display: 'block' }}>
                <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 6 }}>Email</div>
                <input value={email} onChange={e => setEmail(e.target.value)} placeholder="user@example.com" style={{ width: '100%', padding: '8px 10px', borderRadius: 8, border: '1px solid var(--border)' }} />
              </label>

              <div style={{ display: 'flex', gap: 8 }}>
                <Button type="submit">Send invite</Button>
                <Link href="/admin"><Button className="secondary">Back</Button></Link>
              </div>

              {message && <div style={{ marginTop: 8, color: message.includes('failed') || message.includes('error') ? 'crimson' : 'green' }}>{message}</div>}
            </form>
          </Card>
        </aside>
      </div>
    </div>
  )
}

