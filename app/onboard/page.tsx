"use client"
import React, { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

export default function OnboardPage() {
  const [shopName, setShopName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const router = useRouter()

  useEffect(() => {
    // If already have active shop, redirect to pos
    try {
      const active = localStorage.getItem('pos:active-shop')
      if (active) router.replace('/pos')
    } catch (_) {}
  }, [router])

  async function handleCreate(e?: React.FormEvent) {
    e?.preventDefault()
    setError(null)
    setMessage(null)
    if (!shopName || shopName.trim() === '') return setError('Store name is required')
    setLoading(true)
    try {
      let accessToken: string | null = null
      let userId: string | null = null
      try {
        const { data: sessionData } = await supabase.auth.getSession()
        const sessionObj = sessionData as unknown as { session?: { access_token?: string; user?: { id?: string } } } | undefined
        accessToken = sessionObj?.session?.access_token ?? null
        userId = sessionObj?.session?.user?.id ?? null
      } catch (e) {
        console.warn('Onboard: getSession failed', e)
      }

      if (!accessToken || !userId) {
        setError('Not authenticated — please sign in')
        router.push('/login')
        return
      }

      const resp = await fetch('/api/onboard', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({ user_id: userId, shop_name: shopName.trim() })
      })
      const payload = await resp.json()
      if (!resp.ok) throw new Error(payload?.error || 'Onboarding failed')
      try { localStorage.setItem('pos:active-shop', payload?.shop?.id) } catch (e) {}
      // After creating a shop, require BIR acceptance step before dashboard
      router.push('/onboarding/bir-accept')
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      setError(msg || String(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <main style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <form className="form" onSubmit={handleCreate}>
        <div style={{ textAlign: 'center', marginBottom: 8 }}>
          <h2 style={{ margin: 0 }}>Create your shop</h2>
          <p className="muted">You need a shop to use the POS. This will be linked to your account.</p>
        </div>

        <div className="flex-column"><label>Store name</label></div>
        <div className="inputForm"><input value={shopName} onChange={e => setShopName(e.target.value)} placeholder="Store name" className="input" /></div>

        {error && <div style={{ color: 'red' }}>{error}</div>}
        {message && <div style={{ color: 'green' }}>{message}</div>}

        <button className="button-submit" disabled={loading}>{loading ? 'Creating…' : 'Create Shop'}</button>

        <p className="p">Already have a shop? <span className="span" onClick={() => router.push('/pos')} style={{ cursor: 'pointer' }}>Go to POS</span></p>

        <style jsx>{`
          .form { display:flex; flex-direction:column; gap:10px; background:#fff; padding:24px; width:min(520px,95vw); border-radius:12px; box-shadow:0 6px 24px rgba(16,24,40,0.08); }
          .inputForm { border:1.5px solid #ecedec; border-radius:10px; height:50px; display:flex; align-items:center; padding-left:12px; padding-right:12px; }
          .input { border-radius:0; border:none; width:100%; height:100%; background:transparent; padding:0 8px; outline:none; }
          .input::placeholder { color: #9aa3a8 }
          .button-submit { margin-top:10px; background:#151717; color:white; border:none; height:50px; border-radius:10px }
          .p { text-align:center; }
          .span { color:#2d79f3; cursor:pointer }
        `}</style>
      </form>
    </main>
  )
}
