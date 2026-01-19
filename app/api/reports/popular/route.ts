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

    // Validate token and get user
    const { data: authData, error: authErr } = await (supabaseAdmin.auth as unknown as { getUser: (t: string) => Promise<{ data?: unknown; error?: unknown }> }).getUser(accessToken)
    if (authErr) throw authErr
    const userId = (authData as unknown as { user?: { id?: string } })?.user?.id
    if (!userId) throw new Error('Invalid user')

    // Get user's shop
    const { data: mappings, error: mappingErr } = await supabaseAdmin
      .from('user_shops')
      .select('shop_id')
      .eq('user_id', userId)
      .limit(1)

    if (mappingErr) throw mappingErr
    if (!mappings || mappings.length === 0) {
      return NextResponse.json({ error: 'No shop found' }, { status: 404 })
    }

    const shopId = mappings[0]?.shop_id
    if (!shopId) throw new Error('Shop ID not found')

    // Get period from query params
    const url = new URL(req.url)
    const period = url.searchParams.get('period') || 'daily'

    // Calculate date range based on period
    let startDate: Date
    const now = new Date()
    
    switch (period) {
      case 'weekly':
        startDate = new Date(now)
        startDate.setDate(now.getDate() - 7)
        break
      case 'monthly':
        startDate = new Date(now)
        startDate.setMonth(now.getMonth() - 1)
        break
      case 'daily':
      default:
        startDate = new Date(now)
        startDate.setHours(0, 0, 0, 0)
        break
    }

    // Query sales with their items for the period and shop
    const { data: sales, error: salesErr } = await supabaseAdmin
      .from('sales')
      .select(`
        id,
        created_at,
        sale_items (
          product_id,
          product_name,
          quantity,
          price
        )
      `)
      .eq('shop_id', shopId)
      .gte('created_at', startDate.toISOString())
      .order('created_at', { ascending: false })

    if (salesErr) {
      console.error('Sales query error:', salesErr)
      throw salesErr
    }

    // Aggregate data by product
    const productMap = new Map<string, { product_name: string; total_quantity: number; total_sales: number }>()

    if (sales && Array.isArray(sales)) {
      sales.forEach((sale: any) => {
        const items = Array.isArray(sale.sale_items) ? sale.sale_items : []
        items.forEach((item: any) => {
          const productId = item.product_id
          const productName = item.product_name
          const quantity = Number(item.quantity || 0)
          const price = Number(item.price || 0)
          const itemSales = quantity * price

          if (productMap.has(productId)) {
            const existing = productMap.get(productId)!
            existing.total_quantity += quantity
            existing.total_sales += itemSales
          } else {
            productMap.set(productId, {
              product_name: productName,
              total_quantity: quantity,
              total_sales: itemSales
            })
          }
        })
      })
    }

    // Convert to array and sort by total quantity
    const popularArray = Array.from(productMap.entries()).map(([product_id, data]) => ({
      product_id,
      ...data
    }))

    popularArray.sort((a, b) => b.total_quantity - a.total_quantity)

    return NextResponse.json({ data: popularArray })
  } catch (err: unknown) {
    console.error('Popular items error:', err)
    const msg = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: msg || 'Failed to fetch popular items' }, { status: 500 })
  }
}
