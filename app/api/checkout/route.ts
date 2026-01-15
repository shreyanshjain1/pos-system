import { NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase/server'

type SupabaseAuthLike = { getUser: (token: string) => Promise<{ data?: unknown; error?: unknown }> }
type SupabaseUserData = { user?: { id?: string } }

export async function POST(req: Request) {
  try {
    const body: unknown = await req.json()
    if (typeof body !== 'object' || body === null) return NextResponse.json({ error: 'Invalid body' }, { status: 400 })
    const { items, total, payment_method } = body as Record<string, unknown>
    const bodyRec = body as Record<string, unknown>
    if (!items || !Array.isArray(items)) return NextResponse.json({ error: 'Invalid items' }, { status: 400 })

    const supabase = getSupabaseAdmin()

    // Validate caller token and determine user + shop context
    const authHeader = req.headers.get('authorization') || ''
    let userId: string | null = null
    let shopId: string | null = null
    if (authHeader.startsWith('Bearer ')) {
      const accessToken = authHeader.split(' ')[1]
      try {
        const { data: authData, error: authErr } = await (supabase.auth as unknown as SupabaseAuthLike).getUser(accessToken)
        const maybeUserId = (authData as unknown as SupabaseUserData)?.user?.id
        if (!authErr && maybeUserId) {
          userId = maybeUserId
          const { data: mappings } = await supabase.from('user_shops').select('shop_id').eq('user_id', userId).limit(1)
          if (mappings && mappings.length > 0) shopId = (mappings as unknown as Array<{ shop_id?: string }>)[0].shop_id ?? null
        }
      } catch (e) {
        console.warn('Checkout: token validation failed', e)
      }
    }
    // Require a shop mapping for checkout
    if (!shopId) return NextResponse.json({ error: 'No shop mapping' }, { status: 403 })

    // Enforce device authorization for checkout writes. Client must provide device id via `x-device-id` header or `deviceId` in body.
    const deviceIdFromHeader = req.headers.get('x-device-id') || null
    const deviceIdFromBody = (body as Record<string, unknown>)?.deviceId as string | undefined
    const deviceId = deviceIdFromBody ?? deviceIdFromHeader

    // prepare RPC payload early so we can conditionally add device id after device check
    const rpcPayload: Record<string, unknown> = {
      p_total: total,
      p_payment_method: payment_method || 'unknown',
      p_items: items,
      p_user_id: userId,
      p_shop_id: shopId,
    }

    try {
      const { enforceDeviceWritePermission } = await import('@/lib/deviceAuth')
      const userIdForCheck = userId
      const check = await enforceDeviceWritePermission(supabase, shopId!, userIdForCheck, deviceId ?? null)
      if (!check.allowed) return NextResponse.json({ error: check.reason || 'forbidden' }, { status: 403 })
      // pass device_id to RPC for audit/storage
      if (deviceId) rpcPayload.p_device_id = deviceId
    } catch (e) {
      return NextResponse.json({ error: 'authorization_error' }, { status: 403 })
    }

    // Subscription check: require active subscription for user
    try {
      const { getSubscriptionStatus } = await import('@/lib/subscription')
      if (userId) {
        const status = await getSubscriptionStatus(supabase, userId)
        if (!status.active) return NextResponse.json({ error: 'Subscription required or expired' }, { status: 403 })
      }
    } catch (e) {
      console.warn('Checkout: subscription check error', e)
      return NextResponse.json({ error: 'Subscription check error' }, { status: 500 })
    }

    // idempotency: if client provided a client_sale_id, return existing sale if present
    const client_sale_id = bodyRec?.client_sale_id ?? null
    if (client_sale_id) {
      try {
        const { data: existing } = await supabase.from('sales').select('id,sale_id,device_id,total,created_at').eq('sale_id', client_sale_id).maybeSingle()
        if (existing) {
          // also fetch items
          const { data: itemsExisting } = await supabase.from('sale_items').select('id,product_id,quantity,price').eq('sale_id', existing.id)
          return NextResponse.json({ data: { sale: existing, items: itemsExisting || [] } })
        }
      } catch (e) {
        // ignore lookup errors and continue to create
      }
    }

    const { data, error } = await supabase.rpc('create_sale', rpcPayload)
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // if client_sale_id was provided, attempt to set it on the newly created sale (idempotency)
    try {
      const createdSale = (data && data.sale) ? data.sale : (Array.isArray(data) ? data[0] : null)
      const createdId = createdSale?.id ?? (data?.sale?.id ?? null)
      if (client_sale_id && createdId) {
        const { error: updateErr } = await supabase.from('sales').update({ sale_id: client_sale_id }).eq('id', createdId)
        if (updateErr) {
          // if update failed due to unique constraint, fetch the existing sale and return that instead
          try {
            const { data: existing2 } = await supabase.from('sales').select('id,sale_id,device_id,total,created_at').eq('sale_id', client_sale_id).maybeSingle()
            if (existing2) {
              const { data: itemsExisting2 } = await supabase.from('sale_items').select('id,product_id,quantity,price').eq('sale_id', existing2.id)
              return NextResponse.json({ data: { sale: existing2, items: itemsExisting2 || [] } })
            }
          } catch (_) {}
        }
      }
    } catch (_) {}

    return NextResponse.json({ data })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Server error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
