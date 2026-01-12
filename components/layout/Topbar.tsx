"use client"
import React, { useState, useRef, useEffect } from 'react'
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
  const subtitle = parts.length === 0 ? 'Overview of store activity' : `Viewing ${title}`

  return (
    <header className="topbar">
      <div className="left">
        <MobileToggle />
        <div className="title-block">
          <h1>{title}</h1>
        </div>
      </div>

      <div className="right">
        <ProfileMenu />
      </div>
    </header>
  )
}

function MobileToggle() {
  const { toggleMobile, mobileOpen } = useSidebar()
  return (
    <button className="icon-btn" aria-label="Toggle menu" aria-expanded={mobileOpen} onClick={() => toggleMobile()}>
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M4 6h16M4 12h16M4 18h16" stroke="#374151" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
    </button>
  )
}

function ProfileMenu() {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement | null>(null)
  const [user, setUser] = useState<any | null>(null)
  const { shopId } = useShop()
  const [shopName, setShopName] = useState<string | null>(null)
  const displayInitial = shopName ? shopName.charAt(0).toUpperCase() : (user ? ((user.email || '').charAt(0).toUpperCase()) : 'G')
  const displayName = shopName ?? user?.user_metadata?.full_name ?? user?.email ?? ''

  useEffect(() => {
    let mounted = true
    async function load() {
      try {
        const { data } = await supabase.auth.getSession()
        const session = data?.session
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
          const json = await res.json()
          if (!mounted) return
          setShopName(json?.data?.name ?? null)
          return
        }
        // fallback: try to read from public shops table with browser client
        console.warn('ProfileMenu: secure shop endpoint failed, falling back to public shops query')
      } catch (e) {
        console.warn('ProfileMenu: failed to load shop name from secure endpoint', e)
      }

      // Fallback attempt: query `shops` table directly using the browser client
      try {
        const { data: shopRow, error } = await supabase.from('shops').select('name').eq('id', shopId).maybeSingle()
        if (error) {
          console.warn('ProfileMenu: fallback shops query failed', error)
          return
        }
        if (!mounted) return
        setShopName((shopRow as any)?.name ?? null)
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
      await supabase.auth.signOut()
    } catch (e) {
      console.warn('Logout failed', e)
    }
    try { localStorage.removeItem('pos:settings') } catch (_) {}
    window.location.href = '/login'
  }

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button className="icon-btn avatar" aria-label="Account" onClick={() => setOpen(v => !v)}>
        <div className="avatar-inner">{displayInitial}</div>
      </button>

      {open && (
        <div style={{ position: 'absolute', right: 0, top: 48, width: 220, background: '#fff', borderRadius: 10, boxShadow: '0 8px 30px rgba(11,19,42,0.12)', padding: 12, zIndex: 60 }}>
          {!user ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ fontWeight: 700 }}>Guest</div>
              <button className="btn" onClick={() => (window.location.href = '/login')}>Sign in</button>
            </div>
          ) : (
            <>
                    <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 8 }}>
                      <div style={{ width: 44, height: 44, borderRadius: 8, background: '#f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 }}>{displayInitial}</div>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontWeight: 700, maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{displayName}</div>
                      </div>
                    </div>

              <div style={{ borderTop: '1px solid var(--border)', marginTop: 8, paddingTop: 8, display: 'flex', flexDirection: 'column', gap: 8 }}>
                <button className="btn secondary" onClick={() => { setOpen(false); window.location.href = '/settings' }} style={{ justifyContent: 'flex-start' }}>Profile / Settings</button>
                <button className="btn" onClick={handleLogout} style={{ justifyContent: 'flex-start', background: '#ef4444', boxShadow: 'none' }}>Logout</button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}
