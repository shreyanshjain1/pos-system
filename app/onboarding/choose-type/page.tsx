import React from 'react'
import { supabase } from '@/lib/supabase/client'
import { redirect } from 'next/navigation'
import ChooseTypeClient from './ChooseTypeClient'
import getShopForUserOrCreate from '@/lib/getShop'

export default async function Page() {
  // server-side: ensure authenticated and check shop
  try {
    const { data: sessionData } = await supabase.auth.getSession()
    const userId = (sessionData as any)?.session?.user?.id ?? null
    if (!userId) return redirect('/login')

    const shop = await getShopForUserOrCreate(userId)
    if (shop.pos_type && shop.pos_type !== '') {
      // already set -> redirect to correct dashboard
      return redirect(`/${shop.plan}/${shop.pos_type}/dashboard`)
    }

    return (
      <main style={{ padding: 24 }}>
        <div style={{ maxWidth: 880, margin: '0 auto' }}>
          <h1>Welcome — pick your POS type</h1>
          <p className="muted">This choice is permanent. It determines which flows and defaults you get.</p>
          {/* client component handles action */}
          {/* @ts-expect-error Server Component passes props to client */}
          <ChooseTypeClient shop={shop} />
        </div>
      </main>
    )
  } catch (err) {
    console.error('onboarding/choose-type error', err)
    return redirect('/login')
  }
}
