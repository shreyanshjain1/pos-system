import React from 'react'
import { supabase } from '@/lib/supabase/client'
import getShopForUserOrCreate from '@/lib/getShop'
import { redirect } from 'next/navigation'

const ALLOWED_PLANS = ['basic', 'pro', 'advance']
const ALLOWED_TYPES = ['retail', 'coffee', 'food', 'building_materials', 'services']

export default async function Layout({ children, params }: { children: React.ReactNode, params: Promise<{ plan: string, type: string }> | { plan: string, type: string } }) {
  const resolved = await params as { plan?: string, type?: string }
  const plan = resolved?.plan ?? ''
  const type = resolved?.type ?? ''
  if (!ALLOWED_PLANS.includes(plan)) {
    return redirect(`/basic/${type || 'retail'}/dashboard`)
  }
  if (!ALLOWED_TYPES.includes(type)) {
    return redirect(`/${plan}/retail/dashboard`)
  }

  const { data: sessionData } = await supabase.auth.getSession()
  const sessionObj = sessionData as unknown as { session?: { user?: { id?: string } } } | undefined
  const userId = sessionObj?.session?.user?.id ?? null
  if (!userId) return redirect('/login')

  const shop = await getShopForUserOrCreate(userId)

  if (!shop.pos_type || shop.pos_type === '') {
    return redirect('/onboarding/choose-type')
  }

  // If user navigated to mismatching plan/type, redirect to their own dashboard
  if (shop.plan !== plan || shop.pos_type !== type) {
    return redirect(`/${shop.plan}/${shop.pos_type}/dashboard`)
  }

  // Minimal layout with simple nav
  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <aside style={{ width: 220, borderRight: '1px solid #e5e7eb', padding: 12 }}>
        <h3 style={{ marginTop: 6 }}>{shop.shop_name}</h3>
        <nav style={{ marginTop: 12 }}>
          <div><a href={`/${shop.plan}/${shop.pos_type}/dashboard`}>Dashboard</a></div>
          <div><a href={`/${shop.plan}/${shop.pos_type}/products`}>Products</a></div>
          <div><a href={`/${shop.plan}/${shop.pos_type}/checkout`}>Checkout</a></div>
          <div><a href={`/${shop.plan}/${shop.pos_type}/sales-history`}>Sales history</a></div>
        </nav>
      </aside>
      <main style={{ flex: 1, padding: 12 }}>{children}</main>
    </div>
  )
}
