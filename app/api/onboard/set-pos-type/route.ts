import { NextResponse } from 'next/server'
import getSupabaseAdmin from '@/lib/supabase/server'

export async function POST(req: Request) {
  try {
    const authHeader = req.headers.get('authorization') || ''
    if (!authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Missing authorization token' }, { status: 401 })
    }
    const accessToken = authHeader.split(' ')[1]

    const supabaseAdmin = getSupabaseAdmin()

    // Validate token and get caller
    const { data: authData, error: authErr } = await (supabaseAdmin.auth as any).getUser(accessToken)
    if (authErr) throw authErr
    const userId = (authData as any)?.user?.id
    if (!userId) return NextResponse.json({ error: 'Invalid token' }, { status: 401 })

    const body = await req.json().catch(() => ({}))
    const pos_type = body?.pos_type
    if (!pos_type) return NextResponse.json({ error: 'Missing pos_type' }, { status: 400 })

    // find shop
    const shopRes = await supabaseAdmin.from('shops').select('*').eq('owner_user_id', userId).limit(1).maybeSingle()
    if (shopRes.error) throw shopRes.error
    const shop = shopRes.data
    if (!shop) return NextResponse.json({ error: 'Shop not found' }, { status: 404 })

    if (shop.pos_type && shop.pos_type !== '') {
      return NextResponse.json({ error: 'pos_type already set' }, { status: 409 })
    }

    // update only when pos_type is empty
    const upd = await supabaseAdmin.from('shops').update({ pos_type, pos_type_selected_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq('id', shop.id).eq('pos_type', '').select().maybeSingle()
    if (upd.error) throw upd.error

    return NextResponse.json({ shop: upd.data })
  } catch (err: any) {
    console.error('set-pos-type error', err)
    return NextResponse.json({ error: err?.message || 'Server error' }, { status: 500 })
  }
}
