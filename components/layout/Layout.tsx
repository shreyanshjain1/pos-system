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
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!mounted) return
      setAuthed(Boolean(session))
    })

    return () => { mounted = false; try { sub?.subscription?.unsubscribe?.() } catch (e) {} }
  }, [])

  return (
    <div className="app-root">
      <SidebarProvider>
        <ShopProvider>
          {authed && <Sidebar />}
          <div className="main-col">
            {authed && <Topbar />}
            <main className="main-content">
              <div className="container">{children}</div>
            </main>
          </div>
        </ShopProvider>
      </SidebarProvider>
    </div>
  )
}
