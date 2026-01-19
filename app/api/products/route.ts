import { NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase/server'
import { getSubscriptionStatus } from '@/lib/subscription'
import { checkRateLimit } from '@/lib/rateLimit'

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

    let query = supabaseAdmin.from('products').select('id, name, price, cost, stock, barcode, min_stock, max_stock, images, sku, shop_id, created_at').order('created_at', { ascending: false })
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
    // Rate limiting: max 60 product creates per minute per IP
    const ip = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown'
    const rateCheck = checkRateLimit(ip, 60, 60 * 1000)
    if (!rateCheck.allowed) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        { status: 429, headers: { 'Retry-After': String(Math.ceil((rateCheck.resetAt - Date.now()) / 1000)) } }
      )
    }

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
    let callerUserId: string | null = null
    if (authHeader.startsWith('Bearer ')) {
      const accessToken = authHeader.split(' ')[1]
      try {
        const { data: authData, error: authErr } = await (supabaseAdmin.auth as unknown as SupabaseAuthLike).getUser(accessToken)
        if (!authErr && (authData as unknown as SupabaseUserData)?.user?.id) {
          callerUserId = (authData as unknown as SupabaseUserData)?.user?.id as string
          const { data: mappings } = await supabaseAdmin.from('user_shops').select('shop_id').eq('user_id', callerUserId).limit(1)
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

    // Enforce retail subscription for the authenticated user (cashier/shop owner)
    try {
      if (!callerUserId) return NextResponse.json({ error: 'Missing authentication' }, { status: 401 })
      const status = await getSubscriptionStatus(supabaseAdmin, callerUserId)
      if (!status.active) return NextResponse.json({ error: 'Subscription required or expired' }, { status: 403 })
      if ((String(status.pos_type || '').toLowerCase()) !== 'retail') return NextResponse.json({ error: 'Not a retail subscription' }, { status: 403 })
    } catch (e) {
      console.warn('Products POST: subscription check error', e)
      return NextResponse.json({ error: 'Subscription check error' }, { status: 500 })
    }

    // Enforce device authorization for staff accounts. Expect client to send device id
    const deviceIdFromHeader = req.headers.get('x-device-id') || null
    const deviceIdFromBody = (body as Record<string, unknown>)?.deviceId as string | undefined
    const deviceId = deviceIdFromBody ?? deviceIdFromHeader

    const insertPayload: Record<string, unknown> = { name, price: priceNum, cost: Number((body as any).cost || 0) || 0, stock: stockNum, min_stock: Number((body as any).min_stock || 0) || 0, max_stock: Number((body as any).max_stock || null) || null, sku: (body as any).sku ?? null, images: (body as any).images ?? [], barcode, shop_id: assignedShopId }

    const { enforceDeviceWritePermission } = await import('@/lib/deviceAuth')
    try {
      const userToken = authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : null
      const userId = userToken ? ((await (supabaseAdmin.auth as unknown as SupabaseAuthLike).getUser(userToken)).data as SupabaseUserData)?.user?.id : null
      const check = await enforceDeviceWritePermission(supabaseAdmin, assignedShopId ?? null, userId ?? null, deviceId ?? null)
      if (!check.allowed) {
        return NextResponse.json({ error: check.reason || 'forbidden' }, { status: 403 })
      }
      // Do not attach device_id to product rows — device table removed
    } catch (e) {
      // proceed conservatively
      return NextResponse.json({ error: 'authorization_error' }, { status: 403 })
    }
    // sanitize any accidental string 'undefined' values to null
    for (const k of Object.keys(insertPayload)) {
      if (insertPayload[k] === 'undefined') insertPayload[k] = null
    }
    console.error('[Products POST] insertPayload:', insertPayload)
    const { data, error } = await supabaseAdmin.from('products').insert([insertPayload]).select('id, name, price, cost, stock, barcode, min_stock, max_stock, images, sku, shop_id, created_at').single()
    if (error) {
      // handle unique constraint on barcode
      try {
        const code = (error as any)?.code || (error as any)?.statusCode
        const msg = String((error as any)?.message || '')
        if (code === '23505' || /unique/i.test(msg)) {
          return NextResponse.json({ error: 'Barcode already exists for this shop' }, { status: 400 })
        }
      } catch (_) {}
      throw error
    }
    return NextResponse.json({ data }, { status: 201 })
  } catch (err: unknown) {
    console.error('Products POST error', err)
    const message = err instanceof Error ? err.message : 'Server error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
