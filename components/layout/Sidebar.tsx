"use client"
import Link from 'next/link'
import { useState, useEffect } from 'react'
import { useSidebar } from './SidebarContext'

type NavItem = { href: string; label: string; icon?: React.ReactNode }

const ICON = (path: React.ReactNode) => (
  <span className="nav-icon" aria-hidden style={{display: 'inline-flex', width: 20, height: 20}}>{path}</span>
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
  { href: '/barcodes', label: 'Barcodes', icon: ICON(
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" width="20" height="20" focusable="false">
      <path d="M2 6h2v12H2zM6 6h2v12H6zM10 6h8v12h-8z" />
    </svg>
  ) },
  { href: '/sales', label: 'Sales History', icon: ICON(
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" width="20" height="20" focusable="false">
      <path d="M21 12A9 9 0 1 1 3 12a9 9 0 0 1 18 0z" />
      <path d="M12 7v6l4 2" />
    </svg>
  ) },
  { href: '/settings', label: 'Settings', icon: ICON(
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" width="20" height="20" focusable="false">
      <path d="M12 15.5A3.5 3.5 0 1 0 12 8.5a3.5 3.5 0 0 0 0 7z" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06A2 2 0 0 1 2.28 16.9l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09c.7 0 1.3-.4 1.51-1a1.65 1.65 0 0 0-.33-1.82l-.06-.06A2 2 0 0 1 6.1 2.28l.06.06c.5.5 1.2.72 1.82.33.54-.33 1.2-.33 1.82 0 .62.39 1.32.17 1.82-.33l.06-.06A2 2 0 0 1 14 2.28l.06.06c.5.5 1.2.72 1.82.33.54-.33 1.2-.33 1.82 0 .62.39 1.32.17 1.82-.33l.06-.06A2 2 0 0 1 21.72 7.1l-.06.06c-.5.5-.72 1.2-.33 1.82.33.54.33 1.2 0 1.82-.39.62-.17 1.32.33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06c-.5-.5-.72-1.2-.33-1.82.33-.54.33-1.2 0-1.82-.39-.62-.17-1.32.33-1.82l.06-.06A2 2 0 0 1 19.4 15z" />
    </svg>
  ) },
]

export default function Sidebar() {
  const [collapsed, setCollapsed] = useState(false)
  const [hovered, setHovered] = useState('')
  const [userEmail, setUserEmail] = useState<string | null>(null)
  const { mobileOpen, setMobileOpen } = useSidebar()

  useEffect(() => {
    const saved = localStorage.getItem('sidebar-collapsed')
    setCollapsed(saved === '1')
  }, [])

  useEffect(() => {
    let mounted = true
    ;(async () => {
      try {
        const { data } = await import('@/lib/supabase/client').then(m => m.supabase.auth.getSession())
        const session = (data as any)?.session
        if (!mounted) return
        setUserEmail(session?.user?.email ?? null)
      } catch (e) {
        // ignore
      }
    })()
    return () => { mounted = false }
  }, [])

  useEffect(() => {
    localStorage.setItem('sidebar-collapsed', collapsed ? '1' : '0')
  }, [collapsed])

  return (
    <aside className={`sidebar ${collapsed ? 'collapsed' : ''} ${mobileOpen ? 'mobile-open' : ''}`}>
      <div className="brand">
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', justifyContent: 'space-between' }}>
          <div onClick={() => setCollapsed(v => !v)} className="logo" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div className="mark">R</div>
            {!collapsed && <span className="brand-text" >RNL POS</span>}
          </div>
          {mobileOpen && (
            <button className="icon-btn" aria-label="Close menu" onClick={() => setMobileOpen(false)}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M6 6l12 12M6 18L18 6" stroke="#374151" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </button>
          )}
        </div>
      </div>

      <nav className="nav">
        <ul>
          {NAV.map(item => (
            <li key={item.href}>
              <Link
                href={item.href}
                className={`nav-link ${collapsed ? 'center' : ''}`}
                aria-label={item.label}
                title={item.label}
                onMouseEnter={() => setHovered(item.href)}
                onMouseLeave={() => setHovered('')}
                style={{ position: 'relative' }}
              >
                {item.icon}
                {!collapsed ? (
                  <span className="nav-label">{item.label}</span>
                ) : (
                  hovered === item.href && (
                    <span
                      className="nav-tooltip"
                      style={{
                        position: 'absolute',
                        left: 'calc(100% + 8px)',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        background: 'rgba(0,0,0,0.85)',
                        color: '#fff',
                        padding: '6px 8px',
                        borderRadius: 6,
                        whiteSpace: 'nowrap',
                        fontSize: 13,
                        zIndex: 40,
                      }}
                    >
                      {item.label}
                    </span>
                  )
                )}
              </Link>
            </li>
          ))}

          {/* Admin link - visible only to owner email */}
          {userEmail === 'raymart.leyson.rl@gmail.com' && (
            <li>
              <Link href="/admin" className={`nav-link ${collapsed ? 'center' : ''}`} aria-label="Admin" title="Admin" onMouseEnter={() => setHovered('/admin')} onMouseLeave={() => setHovered('')} style={{ position: 'relative' }}>
                {ICON(
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" width="20" height="20" focusable="false">
                    <path d="M12 2l3 7h7l-5.5 4 2 7L12 16l-6.5 4 2-7L2 9h7l3-7z" />
                  </svg>
                )}
                {!collapsed ? <span className="nav-label">Admin</span> : (hovered === '/admin' && (
                  <span className="nav-tooltip" style={{ position: 'absolute', left: 'calc(100% + 8px)', top: '50%', transform: 'translateY(-50%)', background: 'rgba(0,0,0,0.85)', color: '#fff', padding: '6px 8px', borderRadius: 6, whiteSpace: 'nowrap', fontSize: 13, zIndex: 40 }}>Admin</span>
                ))}
              </Link>
            </li>
          )}
        </ul>
      </nav>

      {/* Footer intentionally left empty (logout removed) */}
    </aside>
  )
}
