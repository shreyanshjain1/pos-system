"use client"
import React, { useState } from 'react'
import { useDevice } from '@/components/context/DeviceContext'
import Button from '@/components/ui/Button'
import Card from '@/components/ui/Card'
import fetchWithAuth from '@/lib/fetchWithAuth'

export default function AdminDevicePage() {
  const deviceCtx = useDevice()
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)

  if (!deviceCtx) return null
  const { deviceId, shop, isMain } = deviceCtx
  const shopId = (shop as any)?.id
  const authDevice = (shop as any)?.authoritative_device_id ?? null

  const masked = (id: string | null | undefined) => {
    if (!id) return '—'
    return `${String(id).slice(0,6)}••••${String(id).slice(-4)}`
  }

  async function setThisAsAuthorized() {
    if (!shopId) return setMsg('No active shop')
    setLoading(true); setMsg(null)
    try {
      const res = await fetchWithAuth('/api/admin/shops/set-authoritative', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ shop_id: shopId, device_id: deviceId }) })
      const j = await res.json()
      if (!res.ok) throw new Error(j?.error || 'Failed')
      setMsg('Authorized device set')
    } catch (e: any) { setMsg(String(e?.message || e)) }
    setLoading(false)
  }

  async function clearAuthorized() {
    if (!shopId) return setMsg('No active shop')
    setLoading(true); setMsg(null)
    try {
      const res = await fetchWithAuth('/api/admin/shops/clear-authoritative', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ shop_id: shopId }) })
      const j = await res.json()
      if (!res.ok) throw new Error(j?.error || 'Failed')
      setMsg('Authorized device cleared')
    } catch (e: any) { setMsg(String(e?.message || e)) }
    setLoading(false)
  }

  return (
    <div className="max-w-3xl mx-auto">
      <Card className="p-6">
        <h2 className="text-2xl font-semibold">Device Authorization</h2>
        <div className="mt-4 grid grid-cols-1 gap-3">
          <div>Current authorized device: <strong>{authDevice ? masked(authDevice) : 'None'}</strong></div>
          <div>This device: <strong>{deviceId ? masked(deviceId) : 'Unknown'}</strong> {isMain ? <span className="text-emerald-600 ml-2">(Authorized)</span> : null}</div>
          {msg && <div className="text-sm text-gray-700">{msg}</div>}
          <div className="flex gap-2 mt-3">
            <Button onClick={setThisAsAuthorized} disabled={loading || !deviceId}>Set this device as Authorized</Button>
            <Button onClick={clearAuthorized} disabled={loading}>Clear authorized device</Button>
          </div>
        </div>
      </Card>
    </div>
  )
}
