import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getSupabaseAdmin } from '../../../lib/supabase/server'
import { getCurrentUserAndShopFromCookie } from '../../../lib/compliance'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { disclaimer_version, disclaimer_text } = body
    const cookie = req.headers.get('cookie') || undefined
    const ua = req.headers.get('user-agent') || null
    const ip = req.headers.get('x-forwarded-for') || null

    const admin = getSupabaseAdmin()

    // Support Authorization: Bearer <token> OR cookie fallback
    const authHeader = req.headers.get('authorization') || ''
    let user: any = null
    let shop: any = null

    if (authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1]
      const { data: authData, error: authErr } = await (admin.auth as any).getUser(token)
      if (authErr) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
      user = (authData as any)?.user || null

      if (user && user.id) {
        const { data: shops } = await admin.from('shops').select('*').eq('owner_user_id', user.id).limit(1)
        if (shops && shops.length > 0) {
          shop = shops[0]
        } else {
          // create a default shop for this user
          const { data: newShop, error } = await admin.from('shops').insert({ owner_user_id: user.id, shop_name: `${user.email ?? 'My Shop'}` }).select('*').limit(1)
          if (!error && newShop && newShop.length > 0) shop = newShop[0]
        }
      }
    } else {
      const res = await getCurrentUserAndShopFromCookie(cookie)
      if (!res || !res.user || !res.shop) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
      user = res.user
      shop = res.shop
    }

    if (!user || !shop) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

    const insertBody = {
      owner_user_id: user.id,
      shop_id: shop.id,
      accepted_bir_disclaimer: true,
      disclaimer_version: disclaimer_version,
      disclaimer_text: disclaimer_text,
      ip_address: ip,
      user_agent: ua
    }

    const { error: insertError } = await admin.from('compliance_acceptances').insert(insertBody)
    if (insertError) return NextResponse.json({ error: insertError.message }, { status: 500 })

    // update shops quick flag
    const { error: shopErr } = await admin.from('shops').update({ bir_disclaimer_accepted_at: new Date().toISOString(), bir_disclaimer_version: disclaimer_version }).eq('id', shop.id)
    if (shopErr) {
      // not fatal
    }

    return NextResponse.json({ ok: true })
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || String(err) }, { status: 500 })
  }
}
