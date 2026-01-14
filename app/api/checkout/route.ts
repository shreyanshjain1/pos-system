import { NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase/server'

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { items, total, payment_method } = body
    if (!items || !Array.isArray(items)) return NextResponse.json({ error: 'Invalid items' }, { status: 400 })

    const supabase = getSupabaseAdmin()

    // Validate caller token and determine user + shop context
    const authHeader = req.headers.get('authorization') || ''
    let userId: string | null = null
    let shopId: string | null = null
    if (authHeader.startsWith('Bearer ')) {
      const accessToken = authHeader.split(' ')[1]
      try {
        const { data: authData, error: authErr } = await (supabase.auth as any).getUser(accessToken)
        if (!authErr && authData?.user?.id) {
          userId = authData.user.id
          const { data: mappings } = await supabase.from('user_shops').select('shop_id').eq('user_id', userId).limit(1)
          if (mappings && mappings.length > 0) shopId = mappings[0].shop_id
        }
      } catch (e) {
        console.warn('Checkout: token validation failed', e)
      }
    }
    // NOTE: main-POS / device-level enforcement removed — allow checkouts without requiring a
    // configured main POS device. Device headers may still be present but are not required.
    // Require a shop mapping for checkout
    if (!shopId) return NextResponse.json({ error: 'No shop mapping' }, { status: 403 })

    // main-POS checks removed — proceed with checkout creation for the mapped shop

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
    const client_sale_id = body?.client_sale_id ?? null
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

    // send items as a JSON array (not a string) so the RPC receives a proper JSON/JSONB array
    const rpcPayload: any = {
      p_total: total,
      p_payment_method: payment_method || 'unknown',
      p_items: items,
      p_user_id: userId,
      p_shop_id: shopId,
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
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Server error' }, { status: 500 })
  }
}
