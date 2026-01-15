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
    const { data: authData, error: authErr } = await (supabaseAdmin.auth as unknown as { getUser: (t: string) => Promise<{ data?: unknown; error?: unknown }> }).getUser(accessToken)
    if (authErr) throw authErr
    const caller = (authData as unknown as { user?: { id?: string } })?.user
    if (!caller || !caller.id) return NextResponse.json({ error: 'Invalid user' }, { status: 401 })

    const body: unknown = await req.json().catch(() => ({} as unknown))
    const bodyRec = body as unknown as Record<string, unknown>
    const device_id = (bodyRec?.device_id as string | undefined) ?? null
    const device_brand = (bodyRec?.device_brand as string | null) ?? null
    const user_agent = req.headers.get('user-agent') ?? null
    const ipHeader = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || null
    const ip = ipHeader ? (ipHeader.split(',')[0].trim()) : null

    if (!device_id) {
      return NextResponse.json({ error: 'Missing device_id' }, { status: 400 })
    }

    const userId = caller.id

    // Enforce one device per user (per app). If an existing device row for this user exists, update it
    // to use the new device_id. This prevents users from registering multiple devices for the same account.
    const { data: existingForUser, error: existingErr } = await supabaseAdmin
      .from('user_devices')
      .select('*')
      .eq('user_id', userId)
      .limit(1)
      .maybeSingle()

    if (existingErr) throw existingErr

    if (existingForUser && (existingForUser as any).id) {
      const existingId = (existingForUser as any).id
      const { data: updated, error: updateErr } = await supabaseAdmin
        .from('user_devices')
        .update({ device_id: device_id, last_seen: 'now()', user_agent: user_agent, device_brand: device_brand, ip: ip })
        .eq('id', existingId)
        .select()
      if (updateErr) throw updateErr
      return NextResponse.json({ data: updated })
    }

    // insert new device row when none exists for this user
    const payload: Record<string, unknown> = { user_id: userId, device_id: device_id, device_brand: device_brand, user_agent: user_agent, ip: ip }
    const { data: inserted, error: insertErr } = await supabaseAdmin
      .from('user_devices')
      .insert([payload])
      .select()
    if (insertErr) throw insertErr
    return NextResponse.json({ data: inserted })
  } catch (err: unknown) {
    console.error('devices/register POST error', err)
    const message = err instanceof Error ? err.message : 'Server error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
