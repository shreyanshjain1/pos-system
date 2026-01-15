import { NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase/server'

export async function POST(req: Request) {
  try {
    const body: unknown = await req.json()
    if (typeof body !== 'object' || body === null) return NextResponse.json({ error: 'Invalid body' }, { status: 400 })
    const { code, name, price = 0, stock = 0, device_id } = body as Record<string, unknown>
    if (!code || !name || !device_id) return NextResponse.json({ error: 'Missing fields' }, { status: 400 })

    const supabaseAdmin = getSupabaseAdmin()

    // Determine shop: require user's mapped shop
    const authHeader = req.headers.get('authorization') || ''
    let shopId: string | null = null
    if (authHeader.startsWith('Bearer ')) {
      const accessToken = authHeader.split(' ')[1]
      try {
        const { data: authData } = await (supabaseAdmin.auth as any).getUser(accessToken)
        const userId = authData?.user?.id
        if (userId) {
          const { data: mappings } = await supabaseAdmin.from('user_shops').select('shop_id').eq('user_id', userId).limit(1)
          shopId = mappings && mappings.length > 0 ? (mappings as any)[0].shop_id : null
        }
      } catch (e) { console.warn('create-with-barcode: token invalid', e) }
    }
    if (!shopId) return NextResponse.json({ error: 'No shop mapping' }, { status: 403 })
    // Enforce device authorization for this create
    try {
      const { enforceDeviceWritePermission } = await import('@/lib/deviceAuth')
      const deviceIdHeader = req.headers.get('x-device-id') || String(device_id)
      const { data: authData } = await (supabaseAdmin.auth as any).getUser((req.headers.get('authorization') || '').replace('Bearer ', ''))
      const userId = authData?.user?.id ?? null
      const check = await enforceDeviceWritePermission(supabaseAdmin, shopId, userId, deviceIdHeader ?? null)
      if (!check.allowed) return NextResponse.json({ error: check.reason || 'forbidden' }, { status: 403 })
    } catch (e) {
      return NextResponse.json({ error: 'authorization_error' }, { status: 403 })
    }

    // create product and barcode in a transaction (two inserts)
    const productPayload = { shop_id: shopId, name: String(name), price: Number(price || 0), stock: Number(stock || 0) }
    const { data: product, error: prodErr } = await supabaseAdmin.from('products').insert([productPayload]).select('id,name,price,stock,created_at').maybeSingle()
    if (prodErr || !product) return NextResponse.json({ error: prodErr?.message ?? 'Failed to create product' }, { status: 500 })

    const barcodePayload = { shop_id: shopId, product_id: product.id, code: String(code), device_id: String(device_id) }
    const { data: barcode, error: barErr } = await supabaseAdmin.from('barcodes').insert([barcodePayload]).select('*').maybeSingle()
    if (barErr) {
      // attempt cleanup: remove product
      try { await supabaseAdmin.from('products').delete().eq('id', product.id) } catch (_) {}
      return NextResponse.json({ error: barErr.message }, { status: 500 })
    }

    return NextResponse.json({ product, barcode }, { status: 201 })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Server error'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
