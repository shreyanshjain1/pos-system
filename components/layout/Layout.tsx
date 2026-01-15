"use client"
import React, { useEffect, useState } from 'react'
import Sidebar from './Sidebar'
import Topbar from './Topbar'
import { SidebarProvider } from './SidebarContext'
import { supabase } from '@/lib/supabase/client'
import { ShopProvider } from '@/components/context/ShopContext'

export default function Layout({ children }: { children: React.ReactNode }) {
  const [authed, setAuthed] = useState(false)

  useEffect(() => {
    let mounted = true
    async function check() {
      try {
        const { data } = await supabase.auth.getSession()
        if (!mounted) return
        setAuthed(Boolean(data?.session))
      } catch (err) {
        console.warn('Layout: session check failed', err)
      }
    }
    check()
    const authHandler = supabase.auth as unknown as { onAuthStateChange: (cb: (event: string, session: unknown) => void) => { data?: { subscription?: { unsubscribe?: () => void } } } }
    const { data: sub } = authHandler.onAuthStateChange((_event: string, session: unknown) => {
      if (!mounted) return
      setAuthed(Boolean(session))
    })

    return () => { mounted = false; try { sub?.subscription?.unsubscribe?.() } catch (e) {} }
  }, [])

  return (
    <div className="flex h-screen text-sm">
      <SidebarProvider>
        <ShopProvider>
          {authed && <Sidebar />}

          <div className="flex-1 flex flex-col min-h-0">
            {authed && <Topbar />}

            <main className="flex-1 overflow-auto bg-slate-50">
              <div className="container py-8">{children}</div>
            </main>
          </div>
        </ShopProvider>
      </SidebarProvider>
    </div>
  )
}
