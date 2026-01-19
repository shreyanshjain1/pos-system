import { NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase/server'

export async function GET(req: Request) {
  try {
    const url = new URL(req.url)
    const sinceParam = url.searchParams.get('since')
    const since = sinceParam ? new Date(sinceParam) : new Date()
    // normalize to start of day local
    since.setHours(0, 0, 0, 0)

    const sinceIso = since.toISOString()

    // Aggregate sales totals since start of day
    const supabaseAdmin = getSupabaseAdmin()

    // Determine shop scope from caller (require a mapped shop)
    const authHeader = req.headers.get('authorization') || ''
    if (!authHeader.startsWith('Bearer ')) return NextResponse.json({ error: 'Missing authorization token' }, { status: 401 })
    const accessToken = authHeader.split(' ')[1]
    let shopIds: string[] = []
    try {
      const { data: authData, error: authErr } = await (supabaseAdmin.auth as unknown as { getUser: (t: string) => Promise<{ data?: unknown; error?: unknown }> }).getUser(accessToken)
      if (authErr || !(authData as unknown as { user?: { id?: string } })?.user?.id) return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
      const userId = (authData as unknown as { user?: { id?: string } })?.user?.id as string
      const { data: mappings } = await supabaseAdmin.from('user_shops').select('shop_id').eq('user_id', userId)
      shopIds = (mappings || []).map((m: unknown) => (m as unknown as { shop_id?: string })?.shop_id).filter(Boolean) as string[]
    } catch (e) {
      console.warn('Summary: token validation failed', e)
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    if (shopIds.length === 0) return NextResponse.json({ error: 'No shop mapping' }, { status: 403 })

    const salesQuery = supabaseAdmin.from('sales').select('id, total').gte('created_at', sinceIso).in('shop_id', shopIds)

    const { data: salesRows, error: salesError } = await salesQuery
    if (salesError) throw salesError

    const todaysSales = Array.isArray(salesRows)
      ? salesRows.reduce((s: number, r: any) => s + Number(r?.total || 0), 0)
      : 0

    const transactionsToday = Array.isArray(salesRows) ? salesRows.length : 0

    // collect sale ids for item-level aggregates
    const saleIds = Array.isArray(salesRows) ? salesRows.map((r: any) => r.id).filter(Boolean) : []

    let itemsSoldToday = 0
    let netProfitToday = 0
    if (saleIds.length > 0) {
      // fetch sale items for today's sales
      const { data: itemsRows, error: itemsError } = await supabaseAdmin.from('sale_items').select('quantity,price,product_id').in('sale_id', saleIds)
      if (itemsError) throw itemsError

      const productIds = Array.isArray(itemsRows) ? Array.from(new Set(itemsRows.map((it: any) => it.product_id).filter(Boolean))) : []

      // fetch product costs for profit calculation
      let costMap: Record<string, number> = {}
      if (productIds.length > 0) {
        const { data: productsForCost, error: prodErr } = await supabaseAdmin.from('products').select('id,cost').in('id', productIds)
        if (prodErr) throw prodErr
        if (Array.isArray(productsForCost)) {
          for (const p of productsForCost) costMap[p.id] = Number(p.cost || 0)
        }
      }

      if (Array.isArray(itemsRows)) {
        for (const it of itemsRows as any[]) {
          const qty = Number(it.quantity || 0)
          const price = Number(it.price || 0)
          const cost = Number(costMap[it.product_id] || 0)
          itemsSoldToday += qty
          netProfitToday += (price - cost) * qty
        }
      }
    }

    // Total products, low stock (based on min_stock), and out-of-stock counts
    const productsQuery = supabaseAdmin.from('products').select('id,stock,min_stock').in('shop_id', shopIds)
    const { data: productsRows, error: productsError } = await productsQuery

    if (productsError) throw productsError

    const totalProducts = Array.isArray(productsRows) ? productsRows.length : 0

    let lowStock = 0
    let outOfStock = 0
    if (Array.isArray(productsRows)) {
      for (const p of productsRows as any[]) {
        const stock = Number(p.stock ?? 0)
        const minStock = p.min_stock == null ? null : Number(p.min_stock)
        if (minStock != null) {
          if (stock < minStock) lowStock++
        } else {
          // if min_stock not set, fall back to <5 rule
          if (stock < 5) lowStock++
        }
        if (stock <= 0) outOfStock++
      }
    }

    return NextResponse.json({ todaysSales, transactionsToday, itemsSoldToday, netProfitToday, totalProducts, lowStock, outOfStock })
  } catch (err: unknown) {
    console.error('Summary API error', err)
    const message = err instanceof Error ? err.message : 'Server error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
