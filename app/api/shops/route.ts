import { NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase/server'

export async function GET() {
  try {
    const supabaseAdmin = getSupabaseAdmin()
    // Require authentication and return only shops mapped to the caller
    const req = (globalThis as any)?.event?.request as Request | undefined
    const authHeader = req?.headers.get('authorization') || ''
    if (!authHeader.startsWith('Bearer ')) return NextResponse.json({ error: 'Missing authorization token' }, { status: 401 })
    const accessToken = authHeader.split(' ')[1]
    try {
      const { data: authData, error: authErr } = await (supabaseAdmin.auth as any).getUser(accessToken)
      if (authErr || !authData?.user?.id) return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
      const userId = authData.user.id
      const { data, error } = await supabaseAdmin.from('user_shops').select('shop_id, role, shops(id, name)').eq('user_id', userId)
      if (error) throw error
      const shops = (data || []).map((r: any) => ({ id: r.shop_id || r.shops?.id, name: r.shops?.name, role: r.role }))
      return NextResponse.json({ data: shops })
    } catch (e) {
      console.warn('Shops GET token validation failed', e)
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }
  } catch (err: any) {
    console.error('Shops GET error', err)
    return NextResponse.json({ error: err?.message || 'Server error' }, { status: 500 })
  }
}
