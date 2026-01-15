import { NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase/server'

export async function GET() {
  try {
    const supabaseAdmin = getSupabaseAdmin()
    // Require authentication and return only shops mapped to the caller
    const req = (globalThis as unknown as { event?: { request?: unknown } })?.event?.request as Request | undefined
    const authHeader = req?.headers.get('authorization') || ''
    if (!authHeader.startsWith('Bearer ')) return NextResponse.json({ error: 'Missing authorization token' }, { status: 401 })
    const accessToken = authHeader.split(' ')[1]
    try {
      const { data: authData, error: authErr } = await (supabaseAdmin.auth as unknown as { getUser: (t: string) => Promise<{ data?: unknown; error?: unknown }> }).getUser(accessToken)
      if (authErr || !(authData as unknown as { user?: { id?: string } })?.user?.id) return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
      const userId = (authData as unknown as { user?: { id?: string } })?.user?.id as string
      const { data, error } = await supabaseAdmin.from('user_shops').select('shop_id, role, shops(id, name)').eq('user_id', userId)
      if (error) throw error
      const shops = (data || []).map((r: unknown) => {
        const row = r as unknown as Record<string, unknown>
        const shopsObj = row.shops as unknown as Record<string, unknown> | undefined
        return { id: (row.shop_id as string) || (shopsObj?.id as string | undefined), name: shopsObj?.name as string | undefined, role: row.role as string | undefined }
      })
      return NextResponse.json({ data: shops })
    } catch (e) {
      console.warn('Shops GET token validation failed', e)
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }
  } catch (err: unknown) {
    console.error('Shops GET error', err)
    const message = err instanceof Error ? err.message : 'Server error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
