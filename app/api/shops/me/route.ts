import { NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase/server'

export async function GET(req: Request) {
  try {
    const authHeader = req.headers.get('authorization') || ''
    if (!authHeader.startsWith('Bearer ')) return NextResponse.json({ error: 'Missing authorization token' }, { status: 401 })
    const accessToken = authHeader.split(' ')[1]

    const supabaseAdmin = getSupabaseAdmin()
    const { data: authData, error: authErr } = await (supabaseAdmin.auth as unknown as { getUser: (t: string) => Promise<{ data?: unknown; error?: unknown }> }).getUser(accessToken)
    if (authErr) throw authErr
    const userId = (authData as unknown as { user?: { id?: string } })?.user?.id
    if (!userId) return NextResponse.json({ error: 'Invalid user' }, { status: 401 })

    // Try to read the authoritative_device_id column which may not exist in older DBs.
    let shop: any = null
    try {
      const { data: s, error: shopErr } = await supabaseAdmin.from('shops').select('id,offline_primary_device_id,owner_user_id,name,authoritative_device_id').eq('owner_user_id', userId).maybeSingle()
      if (shopErr) throw shopErr
      shop = s
    } catch (e: any) {
      // If the column doesn't exist (Postgres error 42703), retry without selecting it for backwards compatibility.
      if (e?.code === '42703' || (e?.message && String(e.message).includes('authoritative_device_id'))) {
        const { data: s2, error: shopErr2 } = await supabaseAdmin.from('shops').select('id,offline_primary_device_id,owner_user_id,name').eq('owner_user_id', userId).maybeSingle()
        if (shopErr2) throw shopErr2
        shop = s2
      } else {
        throw e
      }
    }

    if (!shop) return NextResponse.json({ error: 'Shop not found' }, { status: 404 })
    // provide a compatibility field `pos_device_id` mapped from `offline_primary_device_id`
    const out = { ...shop, pos_device_id: (shop as unknown as { offline_primary_device_id?: string })?.offline_primary_device_id ?? null, authoritative_device_id: (shop as any)?.authoritative_device_id ?? null }
    return NextResponse.json({ data: out })
  } catch (err: unknown) {
    console.error('shops/me GET error', err)
    const message = err instanceof Error ? err.message : 'Server error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
