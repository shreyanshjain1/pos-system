"use client"
import React, { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'

type DeviceRow = { id: string; user_id: string; email?: string | null; device_id: string; device_brand?: string | null; last_seen?: string | null; created_at?: string | null; is_primary?: boolean; is_revoked?: boolean }

export default function AdminDevicesPage() {
  const [loading, setLoading] = useState(true)
  const [devices, setDevices] = useState<DeviceRow[]>([])
  const [offlinePrimaryDeviceId, setOfflinePrimaryDeviceId] = useState<string | null>(null)
  const [authoritativeDeviceId, setAuthoritativeDeviceId] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  useEffect(() => { refreshList() }, [])

  async function refreshList() {
    setLoading(true)
    setMessage(null)
    try {
      const session = await supabase.auth.getSession()
      const token = session?.data?.session?.access_token
      const res = await fetch('/api/admin/devices', { headers: token ? { Authorization: `Bearer ${token}` } : {} })
      if (!res.ok) {
        setMessage('Failed to load devices')
        setLoading(false)
        return
      }
      const json = await res.json().catch(() => ({ data: [] } as unknown))
      setDevices((json as unknown as { data?: unknown })?.data as DeviceRow[] || [])
      // fetch authoritative device id for the current shop
      try {
        const shopResp = await fetch('/api/shops/me', { headers: token ? { Authorization: `Bearer ${token}` } : {} })
        if (shopResp.ok) {
          const sj = await shopResp.json().catch(() => ({} as any))
          setAuthoritativeDeviceId(sj?.data?.authoritative_device_id ?? null)
        }
      } catch (_) {}
      // we no longer expose Set Main POS here
    } catch (e) {
      setMessage('Network error')
    } finally { setLoading(false) }
  }

  async function revoke(d: DeviceRow) {
    setMessage(null)
    try {
      const session = await supabase.auth.getSession()
      const token = session?.data?.session?.access_token
      const res = await fetch('/api/admin/devices/revoke', { method: 'POST', headers: { 'content-type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: JSON.stringify({ id: d.id, notify: false }) })
      if (!res.ok) {
        const json = await res.json().catch(() => ({}))
        setMessage(json?.error || 'Revoke failed')
        return
      }
      setMessage('Revoked')
      await refreshList()
    } catch (e) {
      setMessage('Network error')
    }
  }

  async function setAsPrimary(d: DeviceRow) {
    setMessage(null)
    try {
      const session = await supabase.auth.getSession()
      const token = session?.data?.session?.access_token
      // Resolve the current user's shop id
      const shopResp = await fetch('/api/shops/me', { headers: token ? { Authorization: `Bearer ${token}` } : {} })
      if (!shopResp.ok) {
        throw new Error('Failed to resolve shop')
      }
      const shopJson = await shopResp.json().catch(() => ({} as any))
      const shopId = shopJson?.data?.id
      if (!shopId) throw new Error('No active shop')

      const res = await fetch('/api/admin/shops/set-authoritative', { method: 'POST', headers: { 'content-type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: JSON.stringify({ shop_id: shopId, device_id: d.device_id }) })
      const j = await res.json().catch(() => ({} as any))
      if (!res.ok) {
        setMessage(j?.error || 'Failed to set authoritative device')
        return
      }
      setMessage('Main POS set')
      // refresh list so UI shows Main POS buttons correctly
      await refreshList()
    } catch (e) {
      setOfflinePrimaryDeviceId(d.device_id)
      setMessage('Set as primary (local)')
    }
  }

  return (
    <div className="p-6">
      <h2 className="text-xl font-semibold">Admin — Devices</h2>
      <p className="text-sm text-slate-500 mb-4">View and revoke registered devices.</p>

      <Card className="p-6 min-h-[18rem]">
        {message && <div className={`mb-3 ${message?.toLowerCase()?.includes('revoked') ? 'text-emerald-700' : 'text-rose-600'}`}>{message}</div>}
        {loading ? (
          <div>Loading…</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm table-auto">
              <thead>
                <tr className="text-slate-600 text-left">
                  <th className="px-3 py-2">User</th>
                  <th className="px-3 py-2">Device</th>
                  <th className="px-3 py-2">Brand</th>
                  <th className="px-3 py-2">Last seen</th>
                  <th className="px-3 py-2 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {devices.length === 0 && <tr><td colSpan={5} className="px-3 py-4">No devices found.</td></tr>}
                {devices.map(d => (
                  <tr key={d.id} className="border-t">
                    <td className="px-3 py-3 align-top">{d.email || d.user_id}</td>
                    <td className="px-3 py-3 align-top font-mono text-[13px]">{d.device_id}</td>
                    <td className="px-3 py-3 align-top">{d.device_brand || <em className="text-slate-500">n/a</em>}</td>
                    <td className="px-3 py-3 align-top">{d.last_seen ? new Date(d.last_seen).toLocaleString() : '—'}</td>
                    <td className="px-3 py-3 align-top text-right">
                      <div className="flex gap-2 justify-end">
                        {((d.is_primary) || (authoritativeDeviceId && authoritativeDeviceId === d.device_id) || (offlinePrimaryDeviceId && offlinePrimaryDeviceId === d.device_id)) ? (
                          <Button intent="secondary" disabled>Main POS</Button>
                        ) : (
                          <Button intent="secondary" onClick={() => setAsPrimary(d)}>Set Main POS</Button>
                        )}

                        { d.is_revoked ? (
                          <Button onClick={async () => {
                            if (!confirm('Unrevoke this device and allow access?')) return
                            setMessage(null)
                            try {
                              const session = await supabase.auth.getSession()
                              const token = session?.data?.session?.access_token
                              const res = await fetch('/api/admin/devices/unrevoke', { method: 'POST', headers: { 'content-type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: JSON.stringify({ id: d.id }) })
                              if (!res.ok) {
                                const json = await res.json().catch(() => ({} as Record<string, unknown>))
                                setMessage((json as Record<string, unknown>)?.error as string || 'Unrevoke failed')
                                return
                              }
                              setMessage('Device unrevoked')
                              await refreshList()
                            } catch (e) { setMessage('Network error') }
                          }}>Unrevoke</Button>
                        ) : (
                          <>
                            <Button onClick={() => revoke(d)}>Revoke</Button>
                            <Button intent="secondary" onClick={async () => {
                              if (!confirm('Revoke this device and notify the user via email?')) return
                              setMessage(null)
                              try {
                                const session = await supabase.auth.getSession()
                                const token = session?.data?.session?.access_token
                                const res = await fetch('/api/admin/devices/revoke', { method: 'POST', headers: { 'content-type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: JSON.stringify({ id: d.id, notify: true }) })
                                if (!res.ok) {
                                  const json = await res.json().catch(() => ({} as Record<string, unknown>))
                                  setMessage((json as Record<string, unknown>)?.error as string || 'Revoke failed')
                                  return
                                }
                                setMessage('Revoked and user notified')
                                await refreshList()
                              } catch (e) {
                                setMessage('Network error')
                              }
                            }}>Revoke + Notify</Button>
                          </>
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
    </div>
  )
}
