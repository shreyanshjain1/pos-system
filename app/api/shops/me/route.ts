import { NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase/server'

export async function GET(req: Request) {
  try {
    const authHeader = req.headers.get('authorization') || ''
    if (!authHeader.startsWith('Bearer ')) return NextResponse.json({ error: 'Missing authorization token' }, { status: 401 })
    const accessToken = authHeader.split(' ')[1]

    const supabaseAdmin = getSupabaseAdmin()
    const { data: authData, error: authErr } = await (supabaseAdmin.auth as any).getUser(accessToken)
    if (authErr) throw authErr
    const userId = (authData as any)?.user?.id
    if (!userId) return NextResponse.json({ error: 'Invalid user' }, { status: 401 })

    const { data: shop, error: shopErr } = await supabaseAdmin.from('shops').select('id,offline_primary_device_id,owner_user_id,name').eq('owner_user_id', userId).maybeSingle()
    if (shopErr) throw shopErr
    if (!shop) return NextResponse.json({ error: 'Shop not found' }, { status: 404 })
    // provide a compatibility field `pos_device_id` mapped from `offline_primary_device_id`
    const out = { ...shop, pos_device_id: (shop as any).offline_primary_device_id ?? null }
    return NextResponse.json({ data: out })
  } catch (err: any) {
    console.error('shops/me GET error', err)
    return NextResponse.json({ error: err?.message || 'Server error' }, { status: 500 })
  }
}
