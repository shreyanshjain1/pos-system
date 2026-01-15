import { NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase/server'

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> | { id: string } }) {
  try {
    const supabaseAdmin = getSupabaseAdmin()
    const authHeader = req.headers.get('authorization') || ''
    if (!authHeader.startsWith('Bearer ')) return NextResponse.json({ error: 'Missing authorization token' }, { status: 401 })
    const accessToken = authHeader.split(' ')[1]
    try {
      const { data: authData, error: authErr } = await (supabaseAdmin.auth as unknown as { getUser: (t: string) => Promise<{ data?: unknown; error?: unknown }> }).getUser(accessToken)
      if (authErr || !(authData as unknown as { user?: { id?: string } })?.user?.id) return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
      const userId = (authData as unknown as { user?: { id?: string } })?.user?.id as string
      const resolvedParams = await params as { id?: string }
      const shopId = resolvedParams?.id
      if (!shopId) return NextResponse.json({ error: 'Missing shop id' }, { status: 400 })
      const { data, error } = await supabaseAdmin.from('user_shops').select('role, shops(id, name)').eq('user_id', userId).eq('shop_id', shopId).single()
      if (error) {
        if ((error as unknown as { code?: string })?.code === 'PGRST116') return NextResponse.json({ error: 'Not found' }, { status: 404 })
        throw error
      }
      if (!data) return NextResponse.json({ error: 'Not found' }, { status: 404 })
      // Supabase may return related rows as an array (shops: [{...}]) or as an object depending on select
      const shopField = (data as unknown as Record<string, unknown>)?.shops
      const shopName = Array.isArray(shopField) ? ((shopField as unknown[])[0] as Record<string, unknown>)?.name : (shopField as unknown as { name?: string })?.name
      const shop = { id: shopId, name: shopName ?? null, role: (data as unknown as { role?: string })?.role }
      return NextResponse.json({ data: shop })
    } catch (e) {
      console.warn('Shops/[id] GET token validation failed', e)
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }
  } catch (err: unknown) {
    console.error('Shops/[id] GET error', err)
    const message = err instanceof Error ? err.message : 'Server error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
