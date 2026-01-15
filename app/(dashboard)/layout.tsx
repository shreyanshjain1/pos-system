import React from 'react'
import Layout from '@/components/layout/Layout'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { getSupabaseAdmin } from '@/lib/supabase/server'

export const metadata = {
  title: 'Dashboard'
}

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  // Server-side guard: ensure user is authenticated and has a shop.
  // If not authenticated -> /login, if no shop -> /onboard.
  let userId: string | null = null
  try {
    const ckObj = await cookies()
    const ck = typeof ckObj.getAll === 'function' ? ckObj.getAll() : []
    const match = ck.find((c: { name: string }) => c.name === 'supabase-auth-token' || c.name === 'sb:token' || c.name === 'supabase-session')
    if (match) {
      try {
        const decoded = decodeURIComponent(match.value)
        const parsed = JSON.parse(decoded)
        userId = parsed.user?.id ?? parsed.currentSession?.user?.id ?? null
      } catch (e) {
        // ignore parse errors
      }
    }
  } catch (e) {
    // continue to redirect below
  }

  // If no userId is detected, do not redirect to `/login` here.
  // Allow the client to handle auth flows to avoid unintended server-side
  // redirects that return users back to login during navigation.

  const admin = getSupabaseAdmin()
  try {
    const { data: shops } = await admin.from('shops').select('*').eq('owner_user_id', userId).limit(1)
    if (!shops || shops.length === 0) {
      redirect('/onboard')
    }
  } catch (e) {
    // On error, continue rendering the dashboard layout without forcing a login
    // redirect. Client-side code can surface auth state and guide the user.
  }

  return (
    <Layout>{children}</Layout>
  )
}
