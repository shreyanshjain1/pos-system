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
    const { data: authData, error: authErr } = await (supabaseAdmin.auth as any).getUser(accessToken)
    if (authErr) throw authErr
    const callerEmail = (authData as any)?.user?.email
    if (!isOwnerEmail(callerEmail)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await req.json().catch(() => ({}))
    const id = body?.id ?? null
    const user_id = body?.user_id ?? null
    const device_id = body?.device_id ?? null

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

    return NextResponse.json({ data: updRes.data })
  } catch (err: any) {
    console.error('admin/devices/unrevoke POST error', err)
    return NextResponse.json({ error: err?.message || 'Server error' }, { status: 500 })
  }
}
