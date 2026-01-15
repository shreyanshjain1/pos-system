import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getSupabaseAdmin } from '../../../lib/supabase/server'
import { getCurrentUserAndShopFromCookie } from '../../../lib/compliance'

export async function POST(req: NextRequest) {
  try {
    const body: unknown = await req.json().catch(() => ({} as unknown))
    const bodyRec = body as unknown as Record<string, unknown>
    const disclaimer_version = bodyRec?.disclaimer_version
    const disclaimer_text = bodyRec?.disclaimer_text
    const cookie = req.headers.get('cookie') || undefined
    const ua = req.headers.get('user-agent') || null
    const ip = req.headers.get('x-forwarded-for') || null

    const admin = getSupabaseAdmin()

    // Support Authorization: Bearer <token> OR cookie fallback
    const authHeader = req.headers.get('authorization') || ''
    let user: unknown = null
    let shop: unknown = null

    if (authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1]
      const { data: authData, error: authErr } = await (admin.auth as unknown as { getUser: (t: string) => Promise<{ data?: unknown; error?: unknown }> }).getUser(token)
      if (authErr) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
      user = (authData as unknown as { user?: unknown })?.user ?? null

      if (user && (user as unknown as { id?: string })?.id) {
        const { data: shops } = await admin.from('shops').select('*').eq('owner_user_id', (user as unknown as { id?: string })?.id).limit(1)
        if (shops && (shops as unknown[]).length > 0) {
          shop = (shops as unknown[])[0]
        } else {
          // create a default shop for this user
          const { data: newShop, error } = await admin.from('shops').insert({ owner_user_id: (user as unknown as { id?: string })?.id, shop_name: `${(user as unknown as { email?: string })?.email ?? 'My Shop'}` }).select('*').limit(1)
          if (!error && newShop && (newShop as unknown[]).length > 0) shop = (newShop as unknown[])[0]
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
      owner_user_id: (user as unknown as { id?: string })?.id,
      shop_id: (shop as unknown as { id?: string })?.id,
      accepted_bir_disclaimer: true,
      disclaimer_version: disclaimer_version,
      disclaimer_text: disclaimer_text,
      ip_address: ip,
      user_agent: ua
    }

    const { error: insertError } = await admin.from('compliance_acceptances').insert(insertBody)
    if (insertError) return NextResponse.json({ error: insertError.message }, { status: 500 })

    // update shops quick flag (only if we have a shop id)
    const shopId = (shop as unknown as { id?: string })?.id ?? null
    if (shopId) {
      const { error: shopErr } = await admin.from('shops').update({ bir_disclaimer_accepted_at: new Date().toISOString(), bir_disclaimer_version: disclaimer_version }).eq('id', shopId)
      if (shopErr) {
        // not fatal
      }
    }

    return NextResponse.json({ ok: true })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
