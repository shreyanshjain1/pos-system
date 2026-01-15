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

    const salesQuery = supabaseAdmin.from('sales').select('total').gte('created_at', sinceIso).in('shop_id', shopIds)

    const { data: salesRows, error: salesError } = await salesQuery
    if (salesError) throw salesError

    const todaysSales = Array.isArray(salesRows)
      ? salesRows.reduce((s: number, r: unknown) => s + Number((r as unknown as { total?: unknown })?.total || 0), 0)
      : 0

    // Total products count
    const productsQuery = supabaseAdmin.from('products').select('id').in('shop_id', shopIds)
    const { data: productsRows, error: productsError } = await productsQuery

    if (productsError) throw productsError

    const totalProducts = Array.isArray(productsRows) ? productsRows.length : 0

    // Low stock (<5)
    const lowQuery = supabaseAdmin.from('products').select('id').lt('stock', 5).in('shop_id', shopIds)
    const { data: lowRows, error: lowError } = await lowQuery

    if (lowError) throw lowError

    const lowStock = Array.isArray(lowRows) ? lowRows.length : 0

    return NextResponse.json({ todaysSales, totalProducts, lowStock })
  } catch (err: unknown) {
    console.error('Summary API error', err)
    const message = err instanceof Error ? err.message : 'Server error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
