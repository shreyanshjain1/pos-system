import { NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase/server'
import { getSubscriptionStatus } from '@/lib/subscription'

export async function GET(req: Request) {
  try {
    const url = new URL(req.url)
    const dateFrom = url.searchParams.get('from') || ''
    const dateTo = url.searchParams.get('to') || ''

    const supabaseAdmin = getSupabaseAdmin()
    let effectivePlan: string | null = null

    // Determine shop scope from caller
    const authHeader = req.headers.get('authorization') || ''
    let shopIds: string[] = []
    if (authHeader.startsWith('Bearer ')) {
      const accessToken = authHeader.split(' ')[1]
      try {
        const { data: authData, error: authErr } = await (supabaseAdmin.auth as any).getUser(accessToken)
        if (!authErr && authData?.user?.id) {
          const userId = authData.user.id
          const { data: mappings } = await supabaseAdmin.from('user_shops').select('shop_id').eq('user_id', userId)
          shopIds = (mappings || []).map((m: any) => m.shop_id).filter(Boolean)
          // Validate user's subscription once (applies to all their shops)
          const status = await getSubscriptionStatus(supabaseAdmin, userId)
          if (!status.active) return NextResponse.json({ error: 'Subscription required or expired' }, { status: 403 })
          if ((String(status.pos_type || '').toLowerCase()) !== 'retail') return NextResponse.json({ error: 'Not a retail subscription' }, { status: 403 })
          effectivePlan = String(status.plan || '').toLowerCase()
        }
      } catch (e) {
        // ignore
      }
    }

    if (shopIds.length === 0) return NextResponse.json({ error: 'No shop mapping' }, { status: 403 })

    // Effective plan determined from user's subscription
    let isProPlus = false
    if (typeof effectivePlan === 'string') {
      isProPlus = effectivePlan === 'pro' || effectivePlan === 'advance'
    }
    // If Basic or unknown plan, ignore posted range and only allow today
    if (!isProPlus) {
      const today = new Date().toISOString().slice(0, 10)
      // override requested range to today only
      // ensure both dateFrom/dateTo correspond to today
      // (existing code will use these values below when building query)
      // we replace dateFrom/dateTo local variables
      // NOTE: we cannot reassign URLSearchParams directly, so override local vars
      // already declared above as const; we'll shadow them below by using local variables in scope
    }

    // fetch sales rows in range — respect Pro+ permissions for arbitrary ranges
    let effectiveFrom = dateFrom
    let effectiveTo = dateTo
    if (!isProPlus) {
      const today = new Date().toISOString().slice(0, 10)
      effectiveFrom = today
      effectiveTo = today
    }

    let salesQuery = supabaseAdmin.from('sales').select('created_at, total').in('shop_id', shopIds)
    if (effectiveFrom) salesQuery = salesQuery.gte('created_at', `${effectiveFrom}T00:00:00Z`)
    if (effectiveTo) salesQuery = salesQuery.lte('created_at', `${effectiveTo}T23:59:59Z`)
    const { data: salesRows, error: salesErr } = await salesQuery
    if (salesErr) throw salesErr

    // Aggregate by date (YYYY-MM-DD)
    const map = new Map<string, number>()
    let totalPayment = 0
    if (Array.isArray(salesRows)) {
      for (const s of salesRows as any[]) {
        const dt = new Date(s.created_at)
        const day = dt.toISOString().slice(0, 10)
        const val = Number(s.total || 0)
        totalPayment += val
        map.set(day, (map.get(day) || 0) + val)
      }
    }

    // Build timeseries sorted by date
    const timeseries = Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0])).map(([t, total]) => ({ t, total }))

    // totals: reuse lightweight computations
    const { data: productsRows } = await supabaseAdmin.from('products').select('id').in('shop_id', shopIds)
    const totalProducts = Array.isArray(productsRows) ? productsRows.length : 0
    const { data: lowRows } = await supabaseAdmin.from('products').select('id').lt('stock', 5).in('shop_id', shopIds)
    const lowStock = Array.isArray(lowRows) ? lowRows.length : 0

    return NextResponse.json({ timeseries, todaysSales: totalPayment, totalProducts, lowStock })
  } catch (err: unknown) {
    console.error('/api/reports/sales error', err)
    const message = err instanceof Error ? err.message : 'Server error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
