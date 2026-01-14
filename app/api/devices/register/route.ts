import { NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase/server'

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
    const caller = (authData as any)?.user
    if (!caller || !caller.id) return NextResponse.json({ error: 'Invalid user' }, { status: 401 })

    const body = await req.json().catch(() => ({}))
    const device_id = body?.device_id || null
    const device_brand = body?.device_brand ?? null
    const user_agent = req.headers.get('user-agent') ?? null
    const ipHeader = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || null
    const ip = ipHeader ? (ipHeader.split(',')[0].trim()) : null

    if (!device_id) {
      return NextResponse.json({ error: 'Missing device_id' }, { status: 400 })
    }

    const userId = caller.id

    // check if this device already exists for this user
    const { data: existing, error: existingErr } = await supabaseAdmin
      .from('user_devices')
      .select('*')
      .eq('user_id', userId)
      .eq('device_id', device_id)
      .maybeSingle()

    if (existingErr) throw existingErr

    if (existing && existing.id) {
      // update last_seen and metadata
      const { data: updated, error: updateErr } = await supabaseAdmin
        .from('user_devices')
        .update({ last_seen: 'now()', user_agent: user_agent, device_brand: device_brand, ip: ip })
        .eq('id', existing.id)
        .select()

      if (updateErr) throw updateErr
      return NextResponse.json({ data: updated })
    }

    // insert new device row (no device-limit enforcement)
    const payload: any = { user_id: userId, device_id: device_id, device_brand: device_brand, user_agent: user_agent, ip: ip }

    const { data: inserted, error: insertErr } = await supabaseAdmin
      .from('user_devices')
      .insert([payload])
      .select()

    if (insertErr) throw insertErr

    return NextResponse.json({ data: inserted })
  } catch (err: any) {
    console.error('devices/register POST error', err)
    return NextResponse.json({ error: err?.message || 'Server error' }, { status: 500 })
  }
}
