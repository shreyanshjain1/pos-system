import { NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase/server'

export async function POST(req: Request) {
  try {
    const body: unknown = await req.json()
    if (typeof body !== 'object' || body === null) return NextResponse.json({ error: 'Invalid body' }, { status: 400 })
    const { shop_id, device_id } = body as Record<string, unknown>
    if (!shop_id || !device_id) return NextResponse.json({ error: 'Missing fields' }, { status: 400 })

    const supabaseAdmin = getSupabaseAdmin()
    const authHeader = req.headers.get('authorization') || ''
    if (!authHeader.startsWith('Bearer ')) return NextResponse.json({ error: 'Missing token' }, { status: 401 })
    const token = authHeader.split(' ')[1]
    try {
      const { data: authData, error: authErr } = await (supabaseAdmin.auth as any).getUser(token)
      if (authErr) throw authErr
      const userId = (authData?.user?.id) as string | undefined
      if (!userId) return NextResponse.json({ error: 'Invalid user' }, { status: 403 })

      // ensure user is mapped to shop
      const { data: mapping } = await supabaseAdmin.from('user_shops').select('shop_id').eq('user_id', userId).eq('shop_id', shop_id).limit(1)
      if (!mapping || (mapping as any).length === 0) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

      // Only set if authoritative_device_id is null
      const { data: shopRow } = await supabaseAdmin.from('shops').select('id,authoritative_device_id').eq('id', shop_id).limit(1).maybeSingle()
      const current = (shopRow as any)?.authoritative_device_id ?? null
      if (current) return NextResponse.json({ ok: true, message: 'already_claimed', data: { authoritative_device_id: current } })

      const { data, error } = await supabaseAdmin.from('shops').update({ authoritative_device_id: String(device_id), authorized_device_set_at: new Date().toISOString(), authorized_device_set_by: userId }).eq('id', shop_id).select('id,authoritative_device_id,authorized_device_set_at,authorized_device_set_by').maybeSingle()
      if (error) throw error
      return NextResponse.json({ ok: true, data })
    } catch (e) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }
  } catch (err: unknown) {
    console.error('auto-claim error', err)
    const message = err instanceof Error ? err.message : 'Server error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
