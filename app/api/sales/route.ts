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
    const dateFrom = url.searchParams.get('from') || ''
    const dateTo = url.searchParams.get('to') || ''

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

    // Apply optional date filters (expecting YYYY-MM-DD)
    if (dateFrom) {
      // include start of day
      const fromIso = `${dateFrom}T00:00:00Z`
      query = query.gte('created_at', fromIso)
    }
    if (dateTo) {
      // include end of day
      const toIso = `${dateTo}T23:59:59Z`
      query = query.lte('created_at', toIso)
    }

    // Read-only sales listing — allow even if subscription missing/expired.

    const { data, error, count } = await query

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    // Also compute totals across the filtered result set (not just the page)
    try {
      let totalsQuery = supabase
        .from('sales')
        .select('id, total, sale_items(quantity)')
        .order('created_at', { ascending: false })

      if (shopIds.length > 0) totalsQuery = totalsQuery.in('shop_id', shopIds)
      if (dateFrom) totalsQuery = totalsQuery.gte('created_at', `${dateFrom}T00:00:00Z`)
      if (dateTo) totalsQuery = totalsQuery.lte('created_at', `${dateTo}T23:59:59Z`)

      const { data: allData } = await totalsQuery
      let totalPayment = 0
      let totalItems = 0
      if (Array.isArray(allData)) {
        for (const s of allData as any[]) {
          totalPayment += Number(s.total ?? 0)
          const items = Array.isArray(s.sale_items) ? s.sale_items : []
          for (const it of items) totalItems += Number(it.quantity ?? 0)
        }
      }

      return NextResponse.json({ data, count, totals: { total_payment: totalPayment, total_items: totalItems } })
    } catch (e) {
      // if totals computation fails, still return page data
      return NextResponse.json({ data, count })
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Server error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
