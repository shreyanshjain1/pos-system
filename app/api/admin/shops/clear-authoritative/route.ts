import { NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase/server'

export async function POST(req: Request) {
  try {
    const body: unknown = await req.json()
    if (typeof body !== 'object' || body === null) return NextResponse.json({ error: 'Invalid body' }, { status: 400 })
    const { shop_id } = body as Record<string, unknown>
    if (!shop_id) return NextResponse.json({ error: 'Missing fields' }, { status: 400 })

    const supabaseAdmin = getSupabaseAdmin()
    const authHeader = req.headers.get('authorization') || ''
    if (!authHeader.startsWith('Bearer ')) return NextResponse.json({ error: 'Missing token' }, { status: 401 })
    const token = authHeader.split(' ')[1]
    try {
      const { data: authData, error: authErr } = await (supabaseAdmin.auth as any).getUser(token)
      if (authErr) throw authErr
      const userId = (authData?.user?.id) as string | undefined
      if (!userId) return NextResponse.json({ error: 'Invalid user' }, { status: 403 })

      // Ensure caller is admin mapped to shop or owner
      const { data: mapping } = await supabaseAdmin.from('user_shops').select('role').eq('user_id', userId).eq('shop_id', shop_id).limit(1)
      const role = (mapping && mapping[0] && (mapping[0] as any).role) || null
      const isAdmin = role === 'admin' || role === 'owner'
      if (!isAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

      const { data, error } = await supabaseAdmin.from('shops').select('id,authoritative_device_id').eq('id', shop_id).maybeSingle()
      if (error) throw error
      const oldDevice = (data as any)?.authoritative_device_id ?? null
      const { data: upd, error: updErr } = await supabaseAdmin.from('shops').update({ authoritative_device_id: null, authorized_device_set_at: null, authorized_device_set_by: null }).eq('id', shop_id).select('id')
      if (updErr) throw updErr
      // audit the clear action
      try {
        const { auditDeviceEvent } = await import('@/lib/deviceAuth')
        await auditDeviceEvent(supabaseAdmin, { account_id: shop_id, user_id: userId, role: 'admin', oldDeviceId: oldDevice, newDeviceId: null, action: 'clear_authoritative', timestamp: new Date().toISOString(), user_agent: req.headers.get('user-agent') ?? null, ip: req.headers.get('x-forwarded-for') ?? null })
      } catch (e) {}
      return NextResponse.json({ ok: true, data: upd })
    } catch (e) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }
  } catch (err: unknown) {
    console.error('clear-authoritative error', err)
    const message = err instanceof Error ? err.message : 'Server error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
