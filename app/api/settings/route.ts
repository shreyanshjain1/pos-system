import { NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase/server'

export async function GET(req: Request) {
  try {
    const supabaseAdmin = getSupabaseAdmin()
    const authHeader = req.headers.get('authorization') || ''
    if (!authHeader.startsWith('Bearer ')) return NextResponse.json({ error: 'Missing authorization token' }, { status: 401 })
    const accessToken = authHeader.split(' ')[1]
    const { data: authData, error: authErr } = await (supabaseAdmin.auth as any).getUser(accessToken)
    if (authErr || !authData?.user?.id) return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    const userId = authData.user.id

    // find a shop mapped to this user
    const { data: mapping, error: mapErr } = await supabaseAdmin.from('user_shops').select('shop_id').eq('user_id', userId).limit(1).single()
    if (mapErr || !mapping) return NextResponse.json({ error: 'No shop mapping found' }, { status: 404 })
    const shopId = mapping.shop_id

    const { data: shop, error: shopErr } = await supabaseAdmin.from('shops').select('settings').eq('id', shopId).single()
    if (shopErr) return NextResponse.json({ error: shopErr.message || 'Failed to load settings' }, { status: 500 })

    return NextResponse.json({ data: shop?.settings ?? {} })
  } catch (err: any) {
    console.error('/api/settings GET error', err)
    return NextResponse.json({ error: err?.message || 'Server error' }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const supabaseAdmin = getSupabaseAdmin()
    const authHeader = req.headers.get('authorization') || ''
    if (!authHeader.startsWith('Bearer ')) return NextResponse.json({ error: 'Missing authorization token' }, { status: 401 })
    const accessToken = authHeader.split(' ')[1]
    const { data: authData, error: authErr } = await (supabaseAdmin.auth as any).getUser(accessToken)
    if (authErr || !authData?.user?.id) return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    const userId = authData.user.id

    const body = await req.json().catch(() => ({}))

    // find a shop mapped to this user
    const { data: mapping, error: mapErr } = await supabaseAdmin.from('user_shops').select('shop_id').eq('user_id', userId).limit(1).single()
    if (mapErr || !mapping) return NextResponse.json({ error: 'No shop mapping found' }, { status: 404 })
    const shopId = mapping.shop_id

    const { data, error } = await supabaseAdmin.from('shops').update({ settings: body }).eq('id', shopId).select('settings').single()
    if (error) return NextResponse.json({ error: error.message || 'Failed to save settings' }, { status: 500 })

    return NextResponse.json({ data: data.settings })
  } catch (err: any) {
    console.error('/api/settings POST error', err)
    return NextResponse.json({ error: err?.message || 'Server error' }, { status: 500 })
  }
}
