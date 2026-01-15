"use client"
import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createBrowserClient } from '@supabase/auth-helpers-nextjs'

export default function RequireAuth({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const [checking, setChecking] = useState(true)

  useEffect(() => {
    let mounted = true

    async function check() {
      let client: ReturnType<typeof createBrowserClient> | null = null
      try {
        client = createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL || '', process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '')
      } catch (err) {
        console.warn('RequireAuth: createBrowserClient failed (missing env?), redirecting to login', err)
        // If we cannot create a browser client, treat as unauthenticated and redirect.
        try {
          router.replace('/login')
        } catch (e) {
          console.warn('RequireAuth: router.replace failed', e)
        }
        return
      }
      try {
        const { data } = await client.auth.getSession()
        const session = data?.session
        if (!session) {
          router.replace('/login')
          return
        }

        try {
          const active = localStorage.getItem('pos:active-shop')
          if (!active) {
            const accessToken = session.access_token
            if (accessToken) {
              const resp = await fetch('/api/user-shops', { headers: { Authorization: `Bearer ${accessToken}` } })
              if (resp.ok) {
                const payload = await resp.json()
                const shops = payload?.data || []
                if (shops.length > 0) {
                  localStorage.setItem('pos:active-shop', shops[0].id)
                } else {
                  // User has no shop yet — force onboarding
                  router.replace('/onboard')
                  return
                }
              } else {
                // If API fails, be conservative and redirect to onboarding
                router.replace('/onboard')
                return
              }
            } else {
              // no access token — require login
              router.replace('/login')
              return
            }
          }
        } catch (e) {
          console.warn('RequireAuth: failed to set active shop', e)
        }
      } catch (err) {
        console.error('RequireAuth error', err)
        router.replace('/login')
      } finally {
        if (mounted) setChecking(false)
      }
    }

    check()
    return () => { mounted = false }
  }, [router])

  if (checking) return <div className="w-full max-w-lg mx-auto py-8">{/* placeholder while auth checking */}
    <div className="flex items-center justify-center">
      <div className="animate-pulse bg-gray-100 rounded-xl p-4 w-full text-center">Checking authentication…</div>
    </div>
  </div>

  return <>{children}</>
}
