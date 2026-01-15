"use client"
import React, { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import { fetchWithAuth } from '@/lib/fetchWithAuth'
import { useRouter } from 'next/navigation'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'

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
    <div className="py-20 flex items-center justify-center">
      <div className="max-w-3xl w-full px-4">
        <Card>
          <h2 className="mt-0 text-xl font-semibold">Welcome to Store POS</h2>
          <p className="text-gray-500">Please sign in to access the dashboard and POS features.</p>
          <div className="mt-4 flex flex-wrap gap-3">
            <Button onClick={() => router.push('/login')}>Sign in</Button>
            <Button variant="secondary" onClick={handleTest} disabled={testing}>{testing ? 'Testing…' : 'Test'}</Button>
          </div>
        </Card>
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
    const authHandler = supabase.auth as unknown as { onAuthStateChange: (cb: (event: string, session: unknown) => void) => { data?: { subscription?: { unsubscribe?: () => void } } } }
    const { data: sub } = authHandler.onAuthStateChange((_event: string, session: unknown) => {
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
