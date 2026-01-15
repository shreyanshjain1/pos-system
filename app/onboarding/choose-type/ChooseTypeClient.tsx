"use client"
import React, { useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

const TYPES = ['retail', 'coffee', 'food', 'building_materials', 'services']

export default function ChooseTypeClient({ shop }: { shop?: Record<string, unknown> | undefined }) {
  const [selected, setSelected] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  async function confirm() {
    setError(null)
    if (!selected) return setError('Choose a POS type')
    setLoading(true)
    try {
      const { data: sessionData } = await supabase.auth.getSession()
      const sessionObj = sessionData as unknown as { session?: { access_token?: string } } | undefined
      const accessToken = sessionObj?.session?.access_token ?? null
      if (!accessToken) {
        setError('Not authenticated')
        router.push('/login')
        return
      }

      const resp = await fetch('/api/onboard/set-pos-type', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({ pos_type: selected })
      })
      const payload: unknown = await resp.json()
      if (!resp.ok) {
        const errMsg = typeof payload === 'object' && payload !== null ? (payload as Record<string, unknown>)['error'] : undefined
        throw new Error((errMsg as string) || 'Failed')
      }
      const payloadObj = typeof payload === 'object' && payload !== null ? (payload as Record<string, unknown>) : {}
      const shopObj = payloadObj['shop'] as Record<string, unknown> | undefined
      if (!shopObj) throw new Error('No shop returned')
      const plan = shopObj['plan'] as string | undefined
      const posType = shopObj['pos_type'] as string | undefined
      router.push(`/${plan}/${posType}/dashboard`)
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e)
      setError(msg || String(e))
    } finally { setLoading(false) }
  }

  return (
    <div style={{ padding: 24 }}>
      <h2>Choose your POS type</h2>
      <p className="muted">Select the type of POS that best matches your business. You can’t change this later.</p>

      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 12 }}>
        {TYPES.map(t => (
          <div key={t} onClick={() => setSelected(t)} style={{ border: selected === t ? '2px solid #2563eb' : '1px solid #e5e7eb', padding: 16, borderRadius: 8, cursor: 'pointer', minWidth: 160 }}>
            <strong style={{ textTransform: 'capitalize' }}>{t.replace('_', ' ')}</strong>
            <div className="muted" style={{ fontSize: 13 }}>Suitable for {t}</div>
          </div>
        ))}
      </div>

      {error && <div style={{ color: 'red', marginTop: 12 }}>{error}</div>}

      <div style={{ marginTop: 18 }}>
        <button className="button-submit" onClick={confirm} disabled={loading}>{loading ? 'Saving…' : 'Confirm'}</button>
      </div>

      <style jsx>{`
        .muted { color: #6b7280 }
        .button-submit { margin-top:10px; background:#151717; color:white; border:none; height:44px; border-radius:8px; padding:0 16px }
      `}</style>
    </div>
  )
}
