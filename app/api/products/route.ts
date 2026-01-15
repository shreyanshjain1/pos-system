import { NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase/server'
import { getSubscriptionStatus } from '@/lib/subscription'

type SupabaseAuthLike = { getUser: (token: string) => Promise<{ data?: unknown; error?: unknown }> }
type SupabaseUserData = { user?: { id?: string; email?: string } }

export async function GET(req: Request) {
  // Fetch products
  try {
    const supabaseAdmin = getSupabaseAdmin()
    const authHeader = req.headers.get('authorization') || ''
    let shopIds: string[] = []
    if (authHeader.startsWith('Bearer ')) {
      const accessToken = authHeader.split(' ')[1]
      try {
        const { data: authData, error: authErr } = await (supabaseAdmin.auth as unknown as SupabaseAuthLike).getUser(accessToken)
        const userId = (authData as unknown as SupabaseUserData)?.user?.id
        if (!authErr && userId) {
          const { data: mappings } = await supabaseAdmin.from('user_shops').select('shop_id').eq('user_id', userId)
          shopIds = (mappings || []).map((m: unknown) => (m as unknown as { shop_id?: string }).shop_id).filter(Boolean) as string[]
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
        const { data: authData } = await (supabaseAdmin.auth as unknown as SupabaseAuthLike).getUser(token)
        const userId = (authData as unknown as SupabaseUserData)?.user?.id
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
  } catch (err: unknown) {
    console.error('Products GET error', err)
    const message = err instanceof Error ? err.message : 'Server error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function POST(req: Request) {
  // Handle product creation
  try {
    const body: unknown = await req.json()
    console.error('[Products POST] incoming body:', body)
    if (typeof body !== 'object' || body === null) return NextResponse.json({ error: 'Invalid body' }, { status: 400 })
    const { name, price, stock = 0, barcode = null } = body as Record<string, unknown>

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
        const { data: authData, error: authErr } = await (supabaseAdmin.auth as unknown as SupabaseAuthLike).getUser(accessToken)
        if (!authErr && (authData as unknown as SupabaseUserData)?.user?.id) {
          const userId = (authData as unknown as SupabaseUserData)?.user?.id as string
          const { data: mappings } = await supabaseAdmin.from('user_shops').select('shop_id').eq('user_id', userId).limit(1)
          if (mappings && (mappings as unknown[]).length > 0) assignedShopId = ((mappings as unknown as Array<{ shop_id?: string }>)[0].shop_id) ?? null
        }
      } catch (e) {
        console.warn('Products POST: token validation failed', e)
      }
    }

    console.error('[Products POST] assignedShopId:', assignedShopId)
    if (!assignedShopId) {
      return NextResponse.json({ error: 'No shop mapping for user' }, { status: 403 })
    }

    // Enforce device authorization for staff accounts. Expect client to send device id
    const deviceIdFromHeader = req.headers.get('x-device-id') || null
    const deviceIdFromBody = (body as Record<string, unknown>)?.deviceId as string | undefined
    const deviceId = deviceIdFromBody ?? deviceIdFromHeader

    const insertPayload: Record<string, unknown> = { name, price: priceNum, stock: stockNum, barcode, shop_id: assignedShopId }

    const { enforceDeviceWritePermission } = await import('@/lib/deviceAuth')
    try {
      const userToken = authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : null
      const userId = userToken ? ((await (supabaseAdmin.auth as unknown as SupabaseAuthLike).getUser(userToken)).data as SupabaseUserData)?.user?.id : null
      const check = await enforceDeviceWritePermission(supabaseAdmin, assignedShopId ?? null, userId ?? null, deviceId ?? null)
      if (!check.allowed) {
        return NextResponse.json({ error: check.reason || 'forbidden' }, { status: 403 })
      }
      // Attach deviceId to row for audit
      if (deviceId) (insertPayload as any).device_id = deviceId
    } catch (e) {
      // proceed conservatively
      return NextResponse.json({ error: 'authorization_error' }, { status: 403 })
    }
    // sanitize any accidental string 'undefined' values to null
    for (const k of Object.keys(insertPayload)) {
      if (insertPayload[k] === 'undefined') insertPayload[k] = null
    }
    console.error('[Products POST] insertPayload:', insertPayload)
    const { data, error } = await supabaseAdmin.from('products').insert([insertPayload]).select('id, name, price, stock, barcode, created_at').single()
    if (error) throw error
    return NextResponse.json({ data }, { status: 201 })
  } catch (err: unknown) {
    console.error('Products POST error', err)
    const message = err instanceof Error ? err.message : 'Server error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
