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
    const email = bodyRec?.email as string | undefined
    const redirectTo = bodyRec?.redirectTo as string | undefined
    if (!email) return NextResponse.json({ error: 'Missing email' }, { status: 400 })

    // Send invite via admin API
    const inviteRes = await (supabaseAdmin.auth as unknown as { admin: { inviteUserByEmail: (e: string, opts?: { redirectTo?: string }) => Promise<{ data?: unknown; error?: unknown }> } }).admin.inviteUserByEmail(email, { redirectTo })
    if (inviteRes?.error) {
      console.error('invite error', inviteRes.error)
      return NextResponse.json({ error: (inviteRes.error as unknown as { message?: string })?.message || 'Invite failed' }, { status: 500 })
    }

    return NextResponse.json({ data: inviteRes.data })
  } catch (err: unknown) {
    console.error('admin/invite POST error', err)
    const message = err instanceof Error ? err.message : 'Server error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
