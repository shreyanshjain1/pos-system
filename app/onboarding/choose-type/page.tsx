import React from 'react'
import { supabase } from '@/lib/supabase/client'
import { redirect } from 'next/navigation'
import ChooseTypeClient from './ChooseTypeClient'
import getShopForUserOrCreate from '@/lib/getShop'

export default async function Page() {
  // server-side: ensure authenticated and check shop
  try {
    const { data: sessionData } = await supabase.auth.getSession()
    const sessionObj = sessionData as unknown as { session?: { user?: { id?: string } } } | undefined
    const userId = sessionObj?.session?.user?.id ?? null
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
          <ChooseTypeClient shop={shop} />
        </div>
      </main>
    )
  } catch (err: any) {
    // Next.js uses special thrown values (e.g. NEXT_REDIRECT) to signal
    // redirects during SSR / build. If we catch and log them here it
    // creates noisy build-time errors. Re-throw any Next-specific
    // control-flow signals and handle only real errors below.
    if (err && typeof err === 'object' && 'digest' in err && String(err.digest).startsWith('NEXT_')) {
      throw err
    }
    console.error('onboarding/choose-type error', err)
    return redirect('/login')
  }
}
