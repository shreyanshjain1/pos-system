import { NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase/server'

const OWNER_EMAIL = 'raymart.leyson.rl@gmail.com'
function isOwnerEmail(email?: string | null) {
  if (!email) return false
  return email.toLowerCase().trim() === OWNER_EMAIL.toLowerCase()
}

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
    const callerEmail = (authData as unknown as { user?: { email?: string } })?.user?.email
    if (!isOwnerEmail(callerEmail)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body: unknown = await req.json().catch(() => ({} as unknown))
    const bodyRec = body as unknown as Record<string, unknown>
    const id = bodyRec?.id ?? null
    const user_id = bodyRec?.user_id ?? null
    const device_id = bodyRec?.device_id ?? null

    if (!id && !(user_id && device_id)) {
      return NextResponse.json({ error: 'Missing identifier' }, { status: 400 })
    }

    let updRes
    if (id) {
      updRes = await supabaseAdmin.from('user_devices').update({ is_revoked: false }).eq('id', id).select()
    } else {
      updRes = await supabaseAdmin.from('user_devices').update({ is_revoked: false }).match({ user_id, device_id }).select()
    }

    if (updRes.error) throw updRes.error

    // Audit the unrevoke action (best-effort)
    try {
      const affected = (updRes.data && Array.isArray(updRes.data) && (updRes.data as unknown[]).length) ? (updRes.data as unknown[])[0] : null
      const targetDeviceId = device_id ?? ((affected as unknown as Record<string, unknown>)?.device_id ?? null)
      const targetUserId = id ? (affected as unknown as Record<string, unknown>)?.user_id : user_id
      const callerId = (authData as any)?.user?.id ?? null
      const { auditDeviceEvent } = await import('@/lib/deviceAuth')
      await auditDeviceEvent(supabaseAdmin, { accountId: null, userId: callerId, role: 'owner', oldDeviceId: null, newDeviceId: targetDeviceId, action: 'unrevoke_device', timestamp: new Date().toISOString(), ip: req.headers.get('x-forwarded-for') ?? null, userAgent: req.headers.get('user-agent') ?? null, target_user_id: targetUserId })
    } catch (e) {
      // ignore audit failures
    }

    return NextResponse.json({ data: updRes.data })
  } catch (err: unknown) {
    console.error('admin/devices/unrevoke POST error', err)
    const message = err instanceof Error ? err.message : 'Server error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
