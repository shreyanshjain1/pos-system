"use client"
import React, { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import { fetchWithAuth } from '@/lib/fetchWithAuth'
import { useRouter } from 'next/navigation'

function GuestHero() {
  const router = useRouter()
  const [testing, setTesting] = useState(false)

    async function handleTest() {
    setTesting(true)
    try {
      const res = await fetchWithAuth('/api/summary')
      const data = await res.json()
      alert('Summary: ' + JSON.stringify(data))
    } catch (e) {
      alert('Test failed: ' + String(e))
    } finally {
      setTesting(false)
    }
  }

  return (
    <div style={{ paddingTop: 80, paddingBottom: 80, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ maxWidth: 720, width: '100%' }}>
        <div className="card">
          <h2 style={{ marginTop: 0 }}>Welcome to Store POS</h2>
          <p className="muted">Please sign in to access the dashboard and POS features.</p>
          <div style={{ marginTop: 16, display: 'flex', gap: 12 }}>
            <button className="btn" onClick={() => router.push('/login')}>Sign in</button>
            <button className="btn secondary" onClick={handleTest} disabled={testing}>{testing ? 'Testing…' : 'Test'}</button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function AuthGate({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<'loading' | 'authed' | 'guest'>('loading')

  useEffect(() => {
    let mounted = true
    async function init() {
      try {
        const { data } = await supabase.auth.getSession()
        const session = data?.session
        if (!mounted) return
        setStatus(session ? 'authed' : 'guest')
      } catch (e) {
        console.warn('AuthGate: session check failed', e)
        if (mounted) setStatus('guest')
      }
    }
    init()
    // subscribe to auth state changes so UI updates immediately after sign-in/sign-out
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!mounted) return
      setStatus(session ? 'authed' : 'guest')
    })

    return () => {
      mounted = false
      try { sub?.subscription?.unsubscribe?.() } catch (e) {}
    }
  }, [])

  if (status === 'loading') return <div className="card">Checking authentication…</div>
  if (status === 'guest') return <GuestHero />
  return <>{children}</>
}
