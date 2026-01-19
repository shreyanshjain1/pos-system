import { NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase/server'
import { getSubscriptionStatus } from '@/lib/subscription'

type SupabaseAuthLike = { getUser: (token: string) => Promise<{ data?: unknown; error?: unknown }> }
type SupabaseUserData = { user?: { id?: string; email?: string } }

export async function POST(req: Request) {
  try {
    const supabaseAdmin = getSupabaseAdmin()
    const authHeader = req.headers.get('authorization') || ''
    
    if (!authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Missing authentication' }, { status: 401 })
    }

    const accessToken = authHeader.split(' ')[1]
    const { data: authData, error: authErr } = await (supabaseAdmin.auth as unknown as SupabaseAuthLike).getUser(accessToken)
    const userId = (authData as unknown as SupabaseUserData)?.user?.id

    if (authErr || !userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    // Get user's shop
    const { data: mappings } = await supabaseAdmin
      .from('user_shops')
      .select('shop_id')
      .eq('user_id', userId)
      .limit(1)
    
    const shopId = (mappings?.[0] as unknown as { shop_id?: string })?.shop_id
    if (!shopId) {
      return NextResponse.json({ error: 'No shop mapping' }, { status: 403 })
    }

    // Check subscription
    const status = await getSubscriptionStatus(supabaseAdmin, userId)
    if (!status.active) {
      return NextResponse.json({ error: 'Subscription required or expired' }, { status: 403 })
    }

    const body = await req.json() as Record<string, unknown>
    const { orders, serviceFee, deliveryFee } = body as {
      orders?: Array<{ product_id: string; product_name: string; quantity: number; cost: number }>
      serviceFee?: number
      deliveryFee?: number
    }

    if (!Array.isArray(orders) || orders.length === 0) {
      return NextResponse.json({ error: 'Invalid orders' }, { status: 400 })
    }

    const suppliesToCreate = orders.map((order) => {
      const subtotal = Number(order.cost) * Number(order.quantity)
      const serviceFeePortion = subtotal * 0.05
      const grandTotal = subtotal + serviceFeePortion + (Number(deliveryFee) || 0)

      return {
        shop_id: shopId,
        product_id: order.product_id,
        product_name: order.product_name,
        quantity: Number(order.quantity),
        cost: Number(order.cost),
        subtotal,
        service_fee: serviceFeePortion,
        delivery_fee: Number(deliveryFee) || 0,
        grand_total: grandTotal,
        status: 'pending'
      }
    })

    const { data, error } = await supabaseAdmin
      .from('supply_orders')
      .insert(suppliesToCreate)
      .select()

    if (error) {
      console.error('Failed to create supply orders:', error)
      throw error
    }

    return NextResponse.json({ data }, { status: 201 })
  } catch (err: unknown) {
    console.error('Supply orders POST error:', err)
    const message = err instanceof Error ? err.message : 'Server error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function GET(req: Request) {
  try {
    const supabaseAdmin = getSupabaseAdmin()
    const authHeader = req.headers.get('authorization') || ''
    
    if (!authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Missing authentication' }, { status: 401 })
    }

    const accessToken = authHeader.split(' ')[1]
    const { data: authData, error: authErr } = await (supabaseAdmin.auth as unknown as SupabaseAuthLike).getUser(accessToken)
    const userId = (authData as unknown as SupabaseUserData)?.user?.id
    const userEmail = (authData as unknown as SupabaseUserData)?.user?.email

    if (authErr || !userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    // Check if shop_id is provided in query (for admin access)
    const url = new URL(req.url)
    const queryShopId = url.searchParams.get('shop_id')
    
    let targetShopId: string | null = null
    
    // If shop_id is provided, verify admin access
    if (queryShopId) {
      // Check if user is owner
      const OWNER_EMAIL = 'raymart.leyson.rl@gmail.com'
      if (userEmail?.toLowerCase() !== OWNER_EMAIL.toLowerCase()) {
        return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
      }
      targetShopId = queryShopId
    } else {
      // Get user's shop
      const { data: mappings } = await supabaseAdmin
        .from('user_shops')
        .select('shop_id')
        .eq('user_id', userId)
        .limit(1)
      
      targetShopId = (mappings?.[0] as unknown as { shop_id?: string })?.shop_id || null
      if (!targetShopId) {
        return NextResponse.json({ error: 'No shop mapping' }, { status: 403 })
      }
    }

    const { data, error } = await supabaseAdmin
      .from('supply_orders')
      .select('*')
      .eq('shop_id', targetShopId)
      .eq('status', 'pending')
      .order('created_at', { ascending: false })

    if (error) throw error

    return NextResponse.json({ data })
  } catch (err: unknown) {
    console.error('Supply orders GET error:', err)
    const message = err instanceof Error ? err.message : 'Server error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
