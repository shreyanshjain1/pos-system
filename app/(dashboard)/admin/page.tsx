"use client"
import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase/client'

const OWNER_EMAIL = 'raymart.leyson.rl@gmail.com'

export default function AdminPage() {
  const [loading, setLoading] = useState(true)
  const [isOwner, setIsOwner] = useState(false)

  useEffect(() => {
    let mounted = true
    ;(async () => {
      try {
        const { data } = await supabase.auth.getSession()
        const session = (data as any)?.session
        const email = session?.user?.email ?? null
        if (!mounted) return
        setIsOwner(email === OWNER_EMAIL)
      } catch (e) {
        // ignore
      } finally {
        if (mounted) setLoading(false)
      }
    })()
    return () => { mounted = false }
  }, [])

  if (loading) return <div style={{ padding: 20 }}>Checking permissions…</div>
  if (!isOwner) return (
    <div style={{ padding: 20 }}>
      <h1 style={{ fontSize: 20, fontWeight: 700 }}>Access denied</h1>
      <p>You are not authorized to view this page.</p>
      <p><Link href="/dashboard" className="" style={{ color: '#0366d6' }}>Return to dashboard</Link></p>
    </div>
  )

  return (
    <div style={{ padding: 20 }}>
      <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 8 }}>Admin</h1>
      <p style={{ marginBottom: 16 }}>Owner-only administrative area. Add pages below as needed.</p>

      <ul style={{ display: 'grid', gap: 8, listStyle: 'none', padding: 0 }}>
        <li>
          <Link href="/admin/users" style={{ color: '#0366d6' }}>Users</Link>
        </li>
        <li>
          <Link href="/admin/shops" style={{ color: '#0366d6' }}>Shops</Link>
        </li>
        <li>
          <Link href="/admin/products" style={{ color: '#0366d6' }}>Products</Link>
        </li>
        <li>
          <Link href="/admin/settings" style={{ color: '#0366d6' }}>Settings</Link>
        </li>
      </ul>
    </div>
  )
}
