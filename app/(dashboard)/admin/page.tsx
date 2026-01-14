"use client"
import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import Card from '@/components/ui/Card'
import { supabase } from '@/lib/supabase/client'

const OWNER_EMAIL = 'raymart.leyson.rl@gmail.com'
function isOwnerEmail(email?: string | null) {
  if (!email) return false
  return email.toLowerCase().trim() === OWNER_EMAIL.toLowerCase()
}

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
        setIsOwner(isOwnerEmail(email))
      } catch (e) {
        // ignore
      } finally {
        if (mounted) setLoading(false)
      }
    })()
    return () => { mounted = false }
  }, [])

  if (loading) return <div className="p-6">Checking permissions…</div>
  if (!isOwner) return (
    <div className="p-6">
      <h1 className="text-lg font-semibold">Access denied</h1>
      <p className="text-sm text-slate-600">You are not authorized to view this page.</p>
      <p className="mt-3"><Link href="/dashboard" className="text-emerald-600">Return to dashboard</Link></p>
    </div>
  )

  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold mb-2">Admin</h1>
      <p className="text-sm text-slate-500 mb-6">Owner-only administrative area. Add pages below as needed.</p>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <Card>
          <Link href="/admin/users" className="block text-inherit no-underline">
            <div className="flex gap-4 items-center">
              <div className="w-12 h-12 rounded-lg bg-indigo-50 flex items-center justify-center">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M17 21v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2" stroke="#3730a3" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/><circle cx="9" cy="7" r="4" stroke="#3730a3" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/><path d="M22 21v-2a4 4 0 0 0-3-3.87" stroke="#3730a3" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
              </div>
              <div>
                <h3 className="text-base font-medium">Users</h3>
                <div className="text-sm text-slate-500">Manage users, invites, and subscriptions</div>
              </div>
            </div>
          </Link>
        </Card>

        <Card>
          <Link href="/admin/devices" className="block text-inherit no-underline">
            <div className="flex gap-4 items-center">
              <div className="w-12 h-12 rounded-lg bg-emerald-50 flex items-center justify-center">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><rect x="3" y="7" width="18" height="10" rx="2" stroke="#166534" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/><path d="M7 7V5a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v2" stroke="#166534" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
              </div>
              <div>
                <h3 className="text-base font-medium">Devices</h3>
                <div className="text-sm text-slate-500">View and revoke registered devices</div>
              </div>
            </div>
          </Link>
        </Card>

        <Card>
          <Link href="/admin/shops" className="block text-inherit no-underline">
            <div className="flex gap-4 items-center">
              <div className="w-12 h-12 rounded-lg bg-orange-50 flex items-center justify-center">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M3 9l9-6 9 6" stroke="#92400e" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/><path d="M21 10v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-8" stroke="#92400e" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
              </div>
              <div>
                <h3 className="text-base font-medium">Shops</h3>
                <div className="text-sm text-slate-500">Manage store mappings and settings</div>
              </div>
            </div>
          </Link>
        </Card>

        <Card>
          <Link href="/admin/products" className="block text-inherit no-underline">
            <div className="flex gap-4 items-center">
              <div className="w-12 h-12 rounded-lg bg-indigo-50 flex items-center justify-center">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" stroke="#3730a3" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/></svg>
              </div>
              <div>
                <h3 className="text-base font-medium">Products</h3>
                <div className="text-sm text-slate-500">Catalog, inventory and product management</div>
              </div>
            </div>
          </Link>
        </Card>

        <Card>
          <Link href="/admin/settings" className="block text-inherit no-underline">
            <div className="flex gap-4 items-center">
              <div className="w-12 h-12 rounded-lg bg-slate-50 flex items-center justify-center">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M12 15.5A3.5 3.5 0 1 0 12 8.5a3.5 3.5 0 0 0 0 7z" stroke="#0f172a" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51" stroke="#0f172a" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/></svg>
              </div>
              <div>
                <h3 className="text-base font-medium">Settings</h3>
                <div className="text-sm text-slate-500">Application and owner settings</div>
              </div>
            </div>
          </Link>
        </Card>
      </div>
    </div>
  )
}
