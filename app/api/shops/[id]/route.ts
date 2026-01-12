import { NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase/server'

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> | { id: string } }) {
  try {
    const supabaseAdmin = getSupabaseAdmin()
    const authHeader = req.headers.get('authorization') || ''
    if (!authHeader.startsWith('Bearer ')) return NextResponse.json({ error: 'Missing authorization token' }, { status: 401 })
    const accessToken = authHeader.split(' ')[1]
    try {
      const { data: authData, error: authErr } = await (supabaseAdmin.auth as any).getUser(accessToken)
      if (authErr || !authData?.user?.id) return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
      const userId = authData.user.id
      const resolvedParams = await params as { id?: string }
      const shopId = resolvedParams?.id
      if (!shopId) return NextResponse.json({ error: 'Missing shop id' }, { status: 400 })
      const { data, error } = await supabaseAdmin.from('user_shops').select('role, shops(id, name)').eq('user_id', userId).eq('shop_id', shopId).single()
      if (error) {
        if ((error as any).code === 'PGRST116') return NextResponse.json({ error: 'Not found' }, { status: 404 })
        throw error
      }
      if (!data) return NextResponse.json({ error: 'Not found' }, { status: 404 })
      // Supabase may return related rows as an array (shops: [{...}]) or as an object depending on select
      const shopName = Array.isArray((data as any).shops) ? (data as any).shops[0]?.name : (data as any).shops?.name
      const shop = { id: shopId, name: shopName ?? null, role: data.role }
      return NextResponse.json({ data: shop })
    } catch (e) {
      console.warn('Shops/[id] GET token validation failed', e)
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }
  } catch (err: any) {
    console.error('Shops/[id] GET error', err)
    return NextResponse.json({ error: err?.message || 'Server error' }, { status: 500 })
  }
}
