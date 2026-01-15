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
    const callerId = (authData as unknown as { user?: { id?: string } })?.user?.id
    if (!isOwnerEmail(callerEmail)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body: unknown = await req.json().catch(() => ({} as unknown))
    const shopId = (body as unknown as Record<string, unknown>)?.id
    if (!shopId) return NextResponse.json({ error: 'Missing shop id' }, { status: 400 })

    const { error: updErr } = await supabaseAdmin.from('shops').update({ bir_disclaimer_approved_at: new Date().toISOString(), bir_disclaimer_approved_by: callerId }).eq('id', shopId)
    if (updErr) throw updErr

    return NextResponse.json({ ok: true })
  } catch (err: unknown) {
    console.error('admin/shops/approve POST error', err)
    const message = err instanceof Error ? err.message : 'Server error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
