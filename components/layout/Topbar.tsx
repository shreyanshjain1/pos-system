"use client"
import React, { useState, useRef, useEffect } from 'react'
import type { SupabaseClient } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase/client'
import { fetchWithAuth } from '@/lib/fetchWithAuth'
import { useShop } from '@/components/context/ShopContext'
import { usePathname } from 'next/navigation'
import { useSidebar } from './SidebarContext'

function humanizeSegment(seg: string) {
  if (!seg) return ''
  if (seg === 'pos') return 'Point of Sale'
  if (seg === 'sales') return 'Sales'
  if (seg === 'products') return 'Products'
  // replace hyphens and capitalize
  return seg.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
}

export default function Topbar() {
  const pathname = usePathname() || '/'
  const parts = pathname.split('/').filter(Boolean)
  const last = parts.length ? parts[parts.length - 1] : ''
  const title = parts.length === 0 ? 'Dashboard' : humanizeSegment(last || parts[0])

  return (
    <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-sm border-b border-gray-100">
      <div className="container flex items-center justify-between h-16">
        <div className="flex items-center gap-4">
          <MobileToggle />
          <div>
            <h1 className="text-lg font-semibold text-slate-900">{title}</h1>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <ProfileMenu />
        </div>
      </div>
    </header>
  )
}

function MobileToggle() {
  const { toggleMobile, mobileOpen } = useSidebar()
  return (
    <button className="p-2 rounded-md hover:bg-gray-100" aria-label="Toggle menu" aria-expanded={mobileOpen} onClick={() => toggleMobile()}>
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M4 6h16M4 12h16M4 18h16" stroke="#374151" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
    </button>
  )
}

type UserLike = { email?: string; user_metadata?: { full_name?: string } } | null

function ProfileMenu() {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement | null>(null)
  const [user, setUser] = useState<UserLike>(null)
  const { shopId } = useShop()
  const [shopName, setShopName] = useState<string | null>(null)
  const displayInitial = shopName ? shopName.charAt(0).toUpperCase() : (user ? ((user.email || '').charAt(0).toUpperCase()) : 'G')
  const displayName = shopName ?? user?.user_metadata?.full_name ?? user?.email ?? ''

  useEffect(() => {
    let mounted = true
    async function load() {
      try {
        const { data } = await supabase.auth.getSession()
        const session = (data as { session?: { user?: UserLike } } | undefined)?.session
        if (!mounted) return
        setUser(session?.user ?? null)
      } catch (e) {
        console.warn('ProfileMenu: failed to load session', e)
      }
    }
    load()
    return () => { mounted = false }
  }, [])

  useEffect(() => {
    let mounted = true
    async function loadShop() {
      if (!shopId) {
        setShopName(null)
        return
      }
      try {
        const res = await fetchWithAuth(`/api/shops/${shopId}`)
        if (res.ok) {
          const json = await res.json().catch(() => ({} as Record<string, unknown>))
          if (!mounted) return
          setShopName((json as unknown as { data?: { name?: string } })?.data?.name ?? null)
          return
        }
        // fallback: try to read from public shops table with browser client
        console.warn('ProfileMenu: secure shop endpoint failed, falling back to public shops query')
      } catch (e) {
        console.warn('ProfileMenu: failed to load shop name from secure endpoint', e)
      }

      // Fallback attempt: query `shops` table directly using the browser client
      try {
        const browserClient = supabase as unknown as SupabaseClient
        const { data: shopRow, error } = await (browserClient.from('shops').select('name').eq('id', shopId).maybeSingle() as unknown as Promise<{ data?: { name?: string } | null; error?: unknown }>)
        if (error) {
          console.warn('ProfileMenu: fallback shops query failed', error)
          return
        }
        if (!mounted) return
        setShopName((shopRow as unknown as { name?: string })?.name ?? null)
      } catch (e) {
        console.warn('ProfileMenu: fallback shops query threw', e)
      }
    }
    loadShop()
    return () => { mounted = false }
  }, [shopId])

  // If no active shop selected, try to resolve a default shop for the user
  useEffect(() => {
    let mounted = true
    if (shopId || shopName) return
    async function loadDefault() {
      try {
        const res = await fetchWithAuth('/api/shops')
        if (!res.ok) return
        const json = await res.json()
        const list = json.data || []
        if (!mounted) return
        if (list.length === 1) {
          setShopName(list[0]?.name ?? null)
        }
      } catch (e) {
        // ignore
      }
    }
    loadDefault()
    return () => { mounted = false }
  }, [shopId, shopName])

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!ref.current) return
      if (!ref.current.contains(e.target as Node)) setOpen(false)
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('click', onDoc)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('click', onDoc)
      document.removeEventListener('keydown', onKey)
    }
  }, [])

  async function handleLogout() {
    try {
      await (supabase as unknown as { auth?: { signOut?: () => Promise<unknown> } })?.auth?.signOut?.()
    } catch (e) {
      console.warn('Logout failed', e)
    }
    try { localStorage.removeItem('pos:settings') } catch (_) {}
    window.location.href = '/login'
  }

  return (
    <div ref={ref} className="relative">
      <button className="flex items-center gap-2 px-3 py-1 rounded-full bg-white border shadow-sm" aria-label="Account" onClick={() => setOpen(v => !v)}>
        <div className="w-8 h-8 rounded-md bg-gray-100 flex items-center justify-center font-semibold text-sm">{displayInitial}</div>
        <div className="hidden sm:block text-sm text-slate-700">{displayName}</div>
      </button>

      {open && (
        <div className="absolute right-0 top-12 w-56 bg-white rounded-lg shadow-lg p-3 z-50">
          {!user ? (
            <div className="flex flex-col gap-2">
              <div className="font-semibold">Guest</div>
              <button className="px-3 py-2 rounded-md bg-indigo-600 text-white text-sm" onClick={() => (window.location.href = '/login')}>Sign in</button>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-3 mb-2">
                <div className="w-11 h-11 rounded-lg bg-gray-100 flex items-center justify-center font-semibold">{displayInitial}</div>
                <div className="truncate">
                  <div className="font-semibold text-sm truncate">{displayName}</div>
                </div>
              </div>

              <div className="mt-2 border-t pt-2 flex flex-col gap-2">
                <button className="text-sm text-left px-2 py-2 rounded-md hover:bg-gray-50" onClick={() => { setOpen(false); window.location.href = '/settings' }}>Profile / Settings</button>
                <button className="text-sm text-left px-2 py-2 rounded-md text-white bg-red-600 hover:bg-red-700" onClick={handleLogout}>Logout</button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}
