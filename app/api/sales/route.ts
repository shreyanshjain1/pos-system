import { NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase/server'
import { getSubscriptionStatus } from '@/lib/subscription'

type SupabaseAuthLike = { getUser: (token: string) => Promise<{ data?: unknown; error?: unknown }> }
type SupabaseUserData = { user?: { id?: string } }

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
        const { data: authData, error: authErr } = await (supabase.auth as unknown as SupabaseAuthLike).getUser(accessToken)
        const userId = (authData as unknown as SupabaseUserData)?.user?.id
        if (!authErr && userId) {
          const { data: mappings } = await supabase.from('user_shops').select('shop_id').eq('user_id', userId)
          shopIds = (mappings || []).map((m: unknown) => (m as unknown as { shop_id?: string }).shop_id).filter(Boolean) as string[]
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

    // Check subscription for the caller (require active subscription)
    try {
      const authHeader2 = req.headers.get('authorization') || ''
      if (authHeader2.startsWith('Bearer ')) {
        const token = authHeader2.split(' ')[1]
        const { data: authData } = await (supabase.auth as unknown as SupabaseAuthLike).getUser(token)
        const userId = (authData as unknown as SupabaseUserData)?.user?.id
        if (userId) {
          const status = await getSubscriptionStatus(supabase, userId)
          if (!status.active) return NextResponse.json({ error: 'Subscription required or expired' }, { status: 403 })
        }
      }
    } catch (e) {
      console.warn('Sales: subscription check error', e)
    }

    const { data, error, count } = await query

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ data, count })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Server error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
