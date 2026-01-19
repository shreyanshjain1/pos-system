"use client"
import Link from 'next/link'
import { useState, useEffect } from 'react'
import { useSidebar } from './SidebarContext'
import { usePathname } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { sidebarItemVariants, listItem, staggerContainer, transitions } from '@/lib/motion'
import { supabase } from '@/lib/supabase/client'
import { fetchWithAuth } from '@/lib/fetchWithAuth'

type NavItem = { href: string; label: string; icon?: React.ReactNode }

const ICON = (path: React.ReactNode) => (
  <span className="nav-icon" aria-hidden style={{display: 'inline-flex', width: 16, height: 16}}>{path}</span>
)

const NAV: NavItem[] = [
  { href: '/dashboard', label: 'Dashboard', icon: ICON(
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" width="20" height="20" focusable="false">
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="14" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
    </svg>
  ) },
  { href: '/pos', label: 'POS', icon: ICON(
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" width="20" height="20" focusable="false">
      <path d="M3 7h18v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7z" />
      <path d="M7 7v-2a1 1 0 0 1 1-1h8a1 1 0 0 1 1 1v2" />
    </svg>
  ) },
  { href: '/products', label: 'Products', icon: ICON(
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" width="20" height="20" focusable="false">
      <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
      <path d="M12 2v20" />
    </svg>
  ) },
  { href: '/sales', label: 'Sales History', icon: ICON(
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" width="20" height="20" focusable="false">
      <path d="M21 12A9 9 0 1 1 3 12a9 9 0 0 1 18 0z" />
      <path d="M12 7v6l4 2" />
    </svg>
  ) },
  { href: '/reports', label: 'Reports', icon: ICON(
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" width="20" height="20" focusable="false">
      <path d="M3 3v18h18" />
      <path d="M7 14v4" />
      <path d="M12 10v8" />
      <path d="M17 6v12" />
    </svg>
  ) },
  { href: '/plans', label: 'Plans', icon: ICON(
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" width="20" height="20" focusable="false">
      <path d="M3 7h18v4H3z" />
      <path d="M3 13h18v4H3z" />
    </svg>
  ) },
]

export default function Sidebar() {
  const [collapsed, setCollapsed] = useState(false)
  const [userEmail, setUserEmail] = useState<string | null>(null)
  const [subscription, setSubscription] = useState<{ active?: boolean; plan?: string | null; pos_type?: string | null } | null>(null)
  const [subscriptionPlan, setSubscriptionPlan] = useState<string | null>(null)
  const [subscriptionActive, setSubscriptionActive] = useState<boolean>(true)
  const [isOwner, setIsOwner] = useState(false)
  const { mobileOpen, setMobileOpen } = useSidebar()
  const pathname = usePathname() || '/'

  const OWNER_EMAIL = 'raymart.leyson.rl@gmail.com'

  useEffect(() => {
    const saved = localStorage.getItem('sidebar-collapsed')
    setCollapsed(saved === '1')
  }, [])

  useEffect(() => {
    let mounted = true
    ;(async () => {
      try {
        const { data } = await supabase.auth.getSession()
        const session = (data as { session?: { user?: { email?: string } } } | undefined)?.session
        if (!mounted) return
        const email = session?.user?.email ?? null
        setUserEmail(email)
        setIsOwner(email?.toLowerCase().trim() === OWNER_EMAIL.toLowerCase())
      } catch (err) {
        // ignore
      }
    })()
    return () => { mounted = false }
  }, [])

  useEffect(() => {
    let mounted = true
    ;(async () => {
      try {
        const subRes = await fetchWithAuth('/api/subscription')
        if (subRes.ok && mounted) {
          const sj = await subRes.json().catch(() => ({}))
          // normalize plan and active flag (same as POS page)
          const planRaw = (sj?.plan ?? null)
          const plan = planRaw ? String(planRaw).toLowerCase() : null
          setSubscriptionPlan(plan === 'advanced' ? 'advance' : plan)
          setSubscriptionActive(Boolean(sj?.active))
          setSubscription(sj)
        }
      } catch (_) {
        // ignore
      }
    })()
    return () => { mounted = false }
  }, [])

  useEffect(() => {
    localStorage.setItem('sidebar-collapsed', collapsed ? '1' : '0')
  }, [collapsed])

  useEffect(() => {
    // auto-close mobile drawer on route change to avoid lingering overlays
    if (mobileOpen) setMobileOpen(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname])

  const navContent = (
    <>
      <div className="px-4 py-5 flex items-center justify-between border-b border-stone-200">
            <motion.div 
              onClick={() => setCollapsed(v => !v)} 
              className="flex items-center gap-3 cursor-pointer"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              transition={transitions.fast}
            >
              <div className="w-9 h-9 bg-gradient-to-br from-emerald-600 to-emerald-700 text-white rounded-xl flex items-center justify-center font-bold text-sm shadow-sm">R</div>
              {!collapsed && <span className="font-semibold text-stone-900 text-base">RNL POS</span>}
            </motion.div>
        {mobileOpen && (
          <motion.button 
            className="p-2 rounded-lg hover:bg-stone-100 transition-colors" 
            aria-label="Close menu" 
            onClick={() => setMobileOpen(false)}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M6 6l12 12M6 18L18 6" stroke="#57534e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </motion.button>
        )}
      </div>

      <nav className="flex-1 overflow-auto px-3 py-4">
        <motion.ul 
          className="space-y-1"
          variants={staggerContainer}
          initial="hidden"
          animate="visible"
        >
          {NAV.map(item => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
            return (
              <motion.li key={item.href} variants={listItem}>
                <Link
                  href={item.href}
                  className={`flex items-center gap-3 w-full text-sm rounded-xl px-3 py-2.5 relative transition-colors ${
                    isActive 
                      ? 'text-emerald-700 font-medium' 
                      : 'text-stone-600 hover:text-stone-900'
                  } ${collapsed ? 'justify-center' : ''}`}
                  aria-label={item.label}
                  title={item.label}
                >
                  {isActive && (
                    <motion.div
                      layoutId="activeTab"
                      className="absolute inset-0 bg-emerald-50 rounded-xl border border-emerald-100"
                      initial={false}
                      transition={transitions.standard}
                    />
                  )}
                  <span className={`w-5 h-5 relative z-10 ${isActive ? 'text-emerald-600' : ''}`}>{item.icon}</span>
                  {!collapsed && <span className="truncate relative z-10">{item.label}</span>}
                </Link>
              </motion.li>
            )
          })}


          {/* Supply: always visible */}
          <motion.li variants={listItem}>
            <Link href="/supply" className={`flex items-center gap-3 w-full text-sm text-stone-600 hover:text-stone-900 hover:bg-stone-50 rounded-xl px-3 py-2.5 transition-colors ${collapsed ? 'justify-center' : ''}`} aria-label="Supply" title="Supply">
              <span className="w-5 h-5 text-stone-600">{ICON(<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" width="20" height="20" focusable="false"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" /><polyline points="7.5 4.21 12 6.81 16.5 4.21" /><polyline points="7.5 19.79 7.5 14.6 3 12" /><polyline points="21 12 16.5 14.6 16.5 19.79" /><polyline points="3.27 6.96 12 12.01 20.73 6.96" /><line x1="12" y1="22.08" x2="12" y2="12" /></svg>)}</span>
              {!collapsed && <span className="truncate">Supply</span>}
            </Link>
          </motion.li>

          {/* Admin: visible for owner email only */}
          {isOwner && (
            <motion.li variants={listItem}>
              <Link href="/admin" className={`flex items-center gap-3 w-full text-sm text-stone-600 hover:text-stone-900 hover:bg-stone-50 rounded-xl px-3 py-2.5 transition-colors ${collapsed ? 'justify-center' : ''}`} aria-label="Admin" title="Admin">
                <span className="w-5 h-5 text-stone-600">{ICON(<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" width="20" height="20" focusable="false"><path d="M12 2l3 7h7l-5.5 4 2 7L12 16l-6.5 4 2-7L2 9h7l3-7z" /></svg>)}</span>
                {!collapsed && <span className="truncate">Admin</span>}
              </Link>
            </motion.li>
          )}
        </motion.ul>
      </nav>
    </>
  )

  return (
    <>
      {/* Mobile drawer */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div 
              className="fixed inset-0 z-40 bg-black/40 lg:hidden backdrop-blur-sm"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={transitions.fast}
              onClick={() => setMobileOpen(false)} 
            />
            <motion.aside 
              className="fixed left-0 top-0 bottom-0 z-50 h-full bg-white w-64 shadow-2xl lg:hidden flex flex-col"
              initial={{ x: -280 }}
              animate={{ x: 0 }}
              exit={{ x: -280 }}
              transition={transitions.standard}
            >
              {navContent}
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Desktop sidebar */}
      <motion.aside 
        className={`flex-shrink-0 h-screen bg-white border-r border-stone-200 hidden lg:flex flex-col shadow-sm`}
        animate={{ width: collapsed ? 80 : 240 }}
        transition={transitions.standard}
      >
        {navContent}
      </motion.aside>
    </>
  )
}
