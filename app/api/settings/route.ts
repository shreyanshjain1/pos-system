import { NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase/server'

export async function GET(req: Request) {
  try {
    const supabaseAdmin = getSupabaseAdmin()
    const authHeader = req.headers.get('authorization') || ''
    if (!authHeader.startsWith('Bearer ')) return NextResponse.json({ error: 'Missing authorization token' }, { status: 401 })
    const accessToken = authHeader.split(' ')[1]
    const { data: authData, error: authErr } = await (supabaseAdmin.auth as unknown as { getUser: (t: string) => Promise<{ data?: unknown; error?: unknown }> }).getUser(accessToken)
    if (authErr || !(authData as unknown as { user?: { id?: string } })?.user?.id) return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    const userId = (authData as unknown as { user?: { id?: string } })?.user?.id as string

    // find a shop mapped to this user
    const { data: mapping, error: mapErr } = await supabaseAdmin.from('user_shops').select('shop_id').eq('user_id', userId).limit(1).single()
    if (mapErr || !mapping) return NextResponse.json({ error: 'No shop mapping found' }, { status: 404 })
    const shopId = (mapping as unknown as { shop_id?: string })?.shop_id

    const { data: shop, error: shopErr } = await supabaseAdmin.from('shops').select('settings').eq('id', shopId).single()
    if (shopErr) return NextResponse.json({ error: shopErr.message || 'Failed to load settings' }, { status: 500 })

    return NextResponse.json({ data: shop?.settings ?? {} })
  } catch (err: unknown) {
    console.error('/api/settings GET error', err)
    const message = err instanceof Error ? err.message : 'Server error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const supabaseAdmin = getSupabaseAdmin()
    const authHeader = req.headers.get('authorization') || ''
    if (!authHeader.startsWith('Bearer ')) return NextResponse.json({ error: 'Missing authorization token' }, { status: 401 })
    const accessToken = authHeader.split(' ')[1]
    const { data: authData, error: authErr } = await (supabaseAdmin.auth as unknown as { getUser: (t: string) => Promise<{ data?: unknown; error?: unknown }> }).getUser(accessToken)
    if (authErr || !(authData as unknown as { user?: { id?: string } })?.user?.id) return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    const userId = (authData as unknown as { user?: { id?: string } })?.user?.id as string

    const body: unknown = await req.json().catch(() => ({} as unknown))

    // find a shop mapped to this user
    const { data: mapping, error: mapErr } = await supabaseAdmin.from('user_shops').select('shop_id').eq('user_id', userId).limit(1).single()
    if (mapErr || !mapping) return NextResponse.json({ error: 'No shop mapping found' }, { status: 404 })
    const shopId = mapping.shop_id

    const { data, error } = await supabaseAdmin.from('shops').update({ settings: body }).eq('id', shopId).select('settings').single()
    if (error) return NextResponse.json({ error: (error as unknown as { message?: string })?.message || 'Failed to save settings' }, { status: 500 })

    return NextResponse.json({ data: (data as unknown as { settings?: unknown })?.settings })
  } catch (err: unknown) {
    console.error('/api/settings POST error', err)
    const message = err instanceof Error ? err.message : 'Server error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
