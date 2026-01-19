import { NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase/server'

// Dev-only helper to return the raw user_subscriptions row for the authenticated user.
// Only enabled when NODE_ENV !== 'production' or ENABLE_DEBUG_ENDPOINTS === '1'.
export async function GET(req: Request) {
  try {
    const enabled = process.env.ENABLE_DEBUG_ENDPOINTS === '1' || process.env.NODE_ENV !== 'production'
    if (!enabled) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const authHeader = req.headers.get('authorization') || ''
    if (!authHeader.startsWith('Bearer ')) return NextResponse.json({ error: 'Missing authorization token' }, { status: 401 })
    const token = authHeader.split(' ')[1]

    const supabaseAdmin = getSupabaseAdmin()
    const { data: authData, error: authErr } = await (supabaseAdmin.auth as any).getUser(token)
    if (authErr) return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    const userId = authData?.user?.id
    if (!userId) return NextResponse.json({ error: 'Invalid user' }, { status: 401 })

    const { data, error } = await supabaseAdmin.from('user_subscriptions').select('*').eq('user_id', userId).maybeSingle()
    if (error) return NextResponse.json({ error: 'DB error' }, { status: 500 })
    if (!data) return NextResponse.json({ ok: true, subscription: null })

    return NextResponse.json({ ok: true, subscription: data })
  } catch (e: any) {
    console.error('/api/debug/subscription error', e)
    return NextResponse.json({ error: e?.message || 'Server error' }, { status: 500 })
  }
}
