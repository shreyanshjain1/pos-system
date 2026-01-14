import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getSupabaseAdmin } from '../../../lib/supabase/server'

export async function GET(req: NextRequest) {
  try {
    // Allow token via Authorization header (Bearer) or cookie fallback
    const authHeader = req.headers.get('authorization') || ''
    let userId: string | null = null
    const admin = getSupabaseAdmin()

    if (authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1]
      const { data: authData, error: authErr } = await (admin.auth as any).getUser(token)
      if (authErr) return NextResponse.json({ authenticated: false, accepted: false })
      userId = (authData as any)?.user?.id || null
    } else {
      // fallback: try to read from cookie via existing helper logic
      const cookie = req.headers.get('cookie') || undefined
      // lightweight cookie parse to extract supabase session token
      if (cookie) {
        try {
          const match = cookie.split(';').map(s => s.trim()).find(s => s.startsWith('sb:token=') || s.startsWith('supabase-auth-token='))
          if (match) {
            const val = decodeURIComponent(match.split('=')[1])
            const parsed = JSON.parse(val)
            userId = parsed.user?.id ?? parsed.currentSession?.user?.id ?? null
          }
        } catch (e) {
          // ignore
        }
      }
    }

    if (!userId) return NextResponse.json({ authenticated: false, accepted: false, has_shop: false })

    // find shop for user
    const { data: shops } = await admin.from('shops').select('*').eq('owner_user_id', userId).limit(1)
    if (!shops || shops.length === 0) return NextResponse.json({ authenticated: true, accepted: false, approved: false, has_shop: false })
    const shop = shops[0]

    // check compliance_acceptances
    const { data: acc } = await admin.from('compliance_acceptances').select('*').eq('owner_user_id', userId).eq('shop_id', shop.id).order('accepted_at', { ascending: false }).limit(1)
    const accepted = !!(acc && acc.length > 0)

    // determine whether an admin has approved the acceptance (new column on shops)
    const approved = !!shop?.bir_disclaimer_approved_at

    return NextResponse.json({ authenticated: true, accepted, approved, has_shop: true, shop_id: shop.id })
  } catch (err) {
    return NextResponse.json({ authenticated: false, accepted: false })
  }
}
