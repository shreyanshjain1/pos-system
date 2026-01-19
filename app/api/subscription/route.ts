import { NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase/server'
import { getSubscriptionStatus } from '@/lib/subscription'

export async function GET(req: Request) {
  try {
    const authHeader = req.headers.get('authorization') || ''
    if (!authHeader.startsWith('Bearer ')) return NextResponse.json({ error: 'Missing authorization token' }, { status: 401 })
    const accessToken = authHeader.split(' ')[1]

    const supabaseAdmin = getSupabaseAdmin()
    const { data: authData, error: authErr } = await (supabaseAdmin.auth as unknown as { getUser: (t: string) => Promise<{ data?: unknown; error?: unknown }> }).getUser(accessToken)
    if (authErr) throw authErr
    const userId = (authData as unknown as { user?: { id?: string } })?.user?.id
    if (!userId) return NextResponse.json({ error: 'Invalid user' }, { status: 401 })

    const status = await getSubscriptionStatus(supabaseAdmin, userId)
    return NextResponse.json(status)
  } catch (err: unknown) {
    console.error('/api/subscription GET error', err)
    const message = err instanceof Error ? err.message : 'Server error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
