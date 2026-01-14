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
    const email = body?.email
    const redirectTo = body?.redirectTo
    if (!email) return NextResponse.json({ error: 'Missing email' }, { status: 400 })

    // Send invite via admin API
    const inviteRes = await (supabaseAdmin.auth as any).admin.inviteUserByEmail(email, { redirectTo })
    if (inviteRes?.error) {
      console.error('invite error', inviteRes.error)
      return NextResponse.json({ error: inviteRes.error.message || 'Invite failed' }, { status: 500 })
    }

    return NextResponse.json({ data: inviteRes.data })
  } catch (err: any) {
    console.error('admin/invite POST error', err)
    return NextResponse.json({ error: err?.message || 'Server error' }, { status: 500 })
  }
}
