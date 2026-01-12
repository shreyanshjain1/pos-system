import { NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase/server'

export async function GET(req: Request) {
  try {
    const authHeader = req.headers.get('authorization') || ''
    if (!authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Missing authorization token' }, { status: 401 })
    }
    const accessToken = authHeader.split(' ')[1]

    const supabaseAdmin = getSupabaseAdmin()

    // Validate token
    const { data: authData, error: authErr } = await (supabaseAdmin.auth as any).getUser(accessToken)
    if (authErr) throw authErr
    const userId = (authData as any)?.user?.id
    if (!userId) return NextResponse.json({ data: [] })

    // Fetch shops mapped to this user
    const { data, error } = await supabaseAdmin
      .from('user_shops')
      .select('shop_id, role, shops(id, name)')
      .eq('user_id', userId)
      .limit(1)

    if (error) throw error

    const shops = (data || []).map((r: any) => ({ id: r.shop_id || r.shops?.id, name: r.shops?.name, role: r.role }))

    // Do NOT auto-create shops here. If the user has no mapping, return empty list
    // and let the client redirect to onboarding.

    return NextResponse.json({ data: shops })
  } catch (err: any) {
    console.error('user-shops GET error', err)
    return NextResponse.json({ error: err?.message || 'Server error' }, { status: 500 })
  }
}
