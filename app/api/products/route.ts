import { NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase/server'
import { getSubscriptionStatus } from '@/lib/subscription'

export async function GET(req: Request) {
  // Fetch products
  try {
    const supabaseAdmin = getSupabaseAdmin()
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
        }
      } catch (e) {
        console.warn('Products GET: token validation failed', e)
      }
    }
    // Enforce that caller must have at least one mapped shop; do not return global products
    if (shopIds.length === 0) {
      return NextResponse.json({ error: 'No shop mapping' }, { status: 403 })
    }

    // Subscription check: require active subscription for the authenticated user
    try {
      // if there's an authenticated user, validate their subscription
      const authHeader2 = req.headers.get('authorization') || ''
      if (authHeader2.startsWith('Bearer ')) {
        const token = authHeader2.split(' ')[1]
        const { data: authData } = await (supabaseAdmin.auth as any).getUser(token)
        const userId = (authData as any)?.user?.id
        if (userId) {
          const status = await getSubscriptionStatus(supabaseAdmin, userId)
          if (!status.active) {
            return NextResponse.json({ error: 'Subscription required or expired' }, { status: 403 })
          }
        }
      }
    } catch (e) {
      console.warn('Products: subscription check error', e)
    }

    let query = supabaseAdmin.from('products').select('id, name, price, stock, barcode, created_at').order('created_at', { ascending: false })
    query = query.in('shop_id', shopIds)
    const { data, error } = await query
    if (error) throw error
    return NextResponse.json({ data })
  } catch (err: any) {
    console.error('Products GET error', err)
    return NextResponse.json({ error: err?.message || 'Server error' }, { status: 500 })
  }
}

export async function POST(req: Request) {
  // Handle product creation
  try {
    const body = await req.json()
    console.error('[Products POST] incoming body:', body)
    const { name, price, stock = 0, barcode = null } = body

    if (!name || typeof name !== 'string') {
      return NextResponse.json({ error: 'Invalid name' }, { status: 400 })
    }

    const priceNum = Number(price || 0)
    const stockNum = Number(stock || 0)
    if (isNaN(priceNum) || isNaN(stockNum)) {
      return NextResponse.json({ error: 'Invalid numeric values' }, { status: 400 })
    }

    const supabaseAdmin = getSupabaseAdmin()

    // Validate caller and determine shop to assign
    const authHeader = req.headers.get('authorization') || ''
    let assignedShopId: string | null = null
    if (authHeader.startsWith('Bearer ')) {
      const accessToken = authHeader.split(' ')[1]
      try {
        const { data: authData, error: authErr } = await (supabaseAdmin.auth as any).getUser(accessToken)
        if (!authErr && authData?.user?.id) {
          const userId = authData.user.id
          const { data: mappings } = await supabaseAdmin.from('user_shops').select('shop_id').eq('user_id', userId).limit(1)
          if (mappings && mappings.length > 0) assignedShopId = mappings[0].shop_id
        }
      } catch (e) {
        console.warn('Products POST: token validation failed', e)
      }
    }

    if (!assignedShopId) {
      return NextResponse.json({ error: 'No shop mapping for user' }, { status: 403 })
    }

    // Removed main-POS/device-only restriction: allow product creation for mapped shop

    const insertPayload: any = { name, price: priceNum, stock: stockNum, barcode, shop_id: assignedShopId }
    // sanitize any accidental string 'undefined' values to null
    for (const k of Object.keys(insertPayload)) {
      if (insertPayload[k] === 'undefined') insertPayload[k] = null
    }
    console.error('[Products POST] insertPayload:', insertPayload)
    const { data, error } = await supabaseAdmin.from('products').insert([insertPayload]).select('id, name, price, stock, barcode, created_at').single()
    if (error) throw error
    return NextResponse.json({ data }, { status: 201 })
  } catch (err: any) {
    console.error('Products POST error', err)
    return NextResponse.json({ error: err?.message || 'Server error' }, { status: 500 })
  }
}
