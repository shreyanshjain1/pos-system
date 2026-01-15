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
    const { data: authData, error: authErr } = await (supabaseAdmin.auth as unknown as { getUser: (t: string) => Promise<{ data?: unknown; error?: unknown }> }).getUser(accessToken)
    if (authErr) throw authErr
    const userId = (authData as unknown as { user?: { id?: string } })?.user?.id
    if (!userId) return NextResponse.json({ data: [] })

    // Fetch shops mapped to this user
    const { data, error } = await supabaseAdmin
      .from('user_shops')
      .select('shop_id, role, shops(id, name)')
      .eq('user_id', userId)
      .limit(1)

    if (error) throw error

    const shops = (data || []).map((r: unknown) => {
      const row = r as unknown as Record<string, unknown>
      const shopsObj = row.shops as unknown as Record<string, unknown> | undefined
      return { id: (row.shop_id as string) || (shopsObj?.id as string | undefined), name: shopsObj?.name as string | undefined, role: row.role as string | undefined }
    })

    // Do NOT auto-create shops here. If the user has no mapping, return empty list
    // and let the client redirect to onboarding.

    return NextResponse.json({ data: shops })
  } catch (err: unknown) {
    console.error('user-shops GET error', err)
    const message = err instanceof Error ? err.message : 'Server error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
