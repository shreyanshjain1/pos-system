import { NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase/server'

export async function GET(req: Request) {
  try {
    const url = new URL(req.url)
    const page = Number(url.searchParams.get('page') || '1')
    const pageSize = Number(url.searchParams.get('pageSize') || '20')

    const supabase = getSupabaseAdmin()

    const from = (page - 1) * pageSize

    // Determine user's shop scope
    const authHeader = req.headers.get('authorization') || ''
    let shopIds: string[] = []
    if (authHeader.startsWith('Bearer ')) {
      const accessToken = authHeader.split(' ')[1]
      try {
        const { data: authData, error: authErr } = await (supabase.auth as any).getUser(accessToken)
        if (!authErr && authData?.user?.id) {
          const userId = authData.user.id
          const { data: mappings } = await supabase.from('user_shops').select('shop_id').eq('user_id', userId)
          shopIds = (mappings || []).map((m: any) => m.shop_id).filter(Boolean)
        }
      } catch (e) {
        console.warn('Sales GET: token validation failed', e)
      }
    }

    // fetch sales with items and basic pagination, scoped to shopIds
    let query = supabase
      .from('sales')
      .select(
        `id, total, payment_method, created_at, sale_items(id, product_id, quantity, price, product:products(name))`,
        { count: 'exact' }
      )
      .order('created_at', { ascending: false })
      .range(from, from + pageSize - 1)

    if (shopIds.length > 0) {
      query = query.in('shop_id', shopIds)
    } else {
      // Do not return global or shared sales. Require a shop mapping.
      return NextResponse.json({ error: 'No shop mapping' }, { status: 403 })
    }

    const { data, error, count } = await query

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ data, count })
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Server error' }, { status: 500 })
  }
}
