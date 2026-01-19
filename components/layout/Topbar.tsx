"use client"
import React, { useState, useRef, useEffect } from 'react'
import type { SupabaseClient } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase/client'
import { fetchWithAuth } from '@/lib/fetchWithAuth'
import { useShop } from '@/components/context/ShopContext'
import { usePathname } from 'next/navigation'
import { useSidebar } from './SidebarContext'
import { motion, AnimatePresence } from 'framer-motion'
import { buttonVariants, dropdownVariants, transitions } from '@/lib/motion'

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
    <header className="sticky top-0 z-30 bg-white/90 backdrop-blur-md border-b border-stone-200 shadow-sm">
      <div className="container flex items-center justify-between h-14 sm:h-16 px-4 sm:px-6 max-w-[1400px]">
        <div className="flex items-center gap-2 sm:gap-4 min-w-0 flex-1">
          <MobileToggle />
          <div className="truncate">
            <h1 className="text-base sm:text-lg lg:text-xl font-semibold text-stone-900 tracking-tight truncate">{title}</h1>
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
    <motion.button 
      className="p-2 rounded-lg hover:bg-stone-100 transition-colors lg:hidden" 
      aria-label="Toggle menu" 
      aria-expanded={mobileOpen} 
      onClick={() => toggleMobile()}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
    >
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M4 6h16M4 12h16M4 18h16" stroke="#57534e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
    </motion.button>
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
      <motion.button 
        className="flex items-center gap-2.5 px-3 py-2 rounded-xl bg-white border border-stone-200 shadow-sm hover:shadow transition-shadow" 
        aria-label="Account" 
        onClick={() => setOpen(v => !v)}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
      >
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-100 to-emerald-200 flex items-center justify-center font-semibold text-sm text-emerald-700">{displayInitial}</div>
        <div className="hidden sm:block text-sm text-stone-700 font-medium">{displayName}</div>
        <svg className={`w-4 h-4 text-stone-400 transition-transform ${open ? 'rotate-180' : ''}`} viewBox="0 0 24 24" fill="none">
          <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </motion.button>

      <AnimatePresence>
        {open && (
          <motion.div 
            className="absolute right-0 top-14 w-64 bg-white rounded-xl shadow-xl border border-stone-200 p-3 z-50 overflow-hidden"
            variants={dropdownVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
          >
            {!user ? (
              <div className="flex flex-col gap-2">
                <div className="font-semibold text-stone-900">Guest</div>
                <motion.button 
                  className="px-4 py-2.5 rounded-lg bg-emerald-600 text-white text-sm font-medium shadow-sm" 
                  onClick={() => (window.location.href = '/login')}
                  whileHover={{ scale: 1.02, backgroundColor: '#059669' }}
                  whileTap={{ scale: 0.98 }}
                >
                  Sign in
                </motion.button>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-3 mb-3 pb-3 border-b border-stone-200">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-100 to-emerald-200 flex items-center justify-center font-semibold text-emerald-700">{displayInitial}</div>
                  <div className="truncate flex-1">
                    <div className="font-semibold text-sm truncate text-stone-900">{displayName}</div>
                    <div className="text-xs text-stone-500 truncate">{user.email}</div>
                  </div>
                </div>

                <div className="flex flex-col gap-1">
                  {user?.email === 'raymart.leyson.rl@gmail.com' && (
                    <motion.button 
                      className="text-sm text-left px-3 py-2.5 rounded-lg hover:bg-stone-50 text-stone-700 transition-colors" 
                      onClick={() => { setOpen(false); window.location.href = '/admin' }}
                      whileHover={{ x: 2 }}
                      transition={transitions.fast}
                    >
                      Admin
                    </motion.button>
                  )}
                  <motion.button 
                    className="text-sm text-left px-3 py-2.5 rounded-lg hover:bg-stone-50 text-stone-700 transition-colors" 
                    onClick={() => { setOpen(false); window.location.href = '/settings' }}
                    whileHover={{ x: 2 }}
                    transition={transitions.fast}
                  >
                    Settings
                  </motion.button>
                  <motion.button 
                    className="text-sm text-left px-3 py-2.5 rounded-lg text-white bg-red-600 hover:bg-red-700 font-medium transition-colors" 
                    onClick={handleLogout}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    Logout
                  </motion.button>
                </div>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
