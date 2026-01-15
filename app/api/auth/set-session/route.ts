import { NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase/server'

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const accessToken = body?.accessToken
    if (!accessToken) return NextResponse.json({ ok: false, error: 'missing_access_token' }, { status: 400 })

    const admin = getSupabaseAdmin()
    // admin.auth.getUser may have a different typing; cast as needed
    const getUser = (admin.auth as unknown as { getUser: (t: string) => Promise<{ data?: unknown; error?: unknown }> }).getUser
    const { data: authData, error: authErr } = await getUser(accessToken)
    if (authErr) return NextResponse.json({ ok: false, error: 'invalid_token' }, { status: 401 })

    const userId = (authData as unknown as { user?: { id?: string } })?.user?.id ?? null
    const sessionValue = JSON.stringify({ currentSession: { user: { id: userId }, access_token: accessToken } })

    const cookie = `supabase-session=${encodeURIComponent(sessionValue)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${60 * 60 * 24 * 7}`

    return NextResponse.json({ ok: true }, { status: 200, headers: { 'Set-Cookie': cookie } })
  } catch (err) {
    return NextResponse.json({ ok: false, error: 'server_error' }, { status: 500 })
  }
}
