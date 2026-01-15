import { NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase/server'

type SupabaseAuthLike = { getUser: (token: string) => Promise<{ data?: unknown; error?: unknown }> }
type SupabaseUserData = { user?: { id?: string } }

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> | { id: string } }) {
  try {
    const resolved = (await params) as { id?: string }
    const id = resolved?.id
    const supabaseAdmin = getSupabaseAdmin()

    const { data, error } = await supabaseAdmin.from('products').select('id, name, price, stock, barcode, shop_id, created_at').eq('id', id).single()
    if (error) throw error

    const product: unknown = data
    // Product MUST have a shop_id and caller must be a member of that shop
    const productShopId = (product as unknown as { shop_id?: string })?.shop_id
    if (!productShopId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    if (productShopId) {
      // Require that caller is both a member of the shop and the device is the authoritative device
      const authHeader = req.headers.get('authorization') || ''
      if (!authHeader.startsWith('Bearer ')) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
      const accessToken = authHeader.split(' ')[1]
      const { data: authData, error: authErr } = await (supabaseAdmin.auth as unknown as SupabaseAuthLike).getUser(accessToken)
      const userId = (authData as unknown as SupabaseUserData)?.user?.id
      if (authErr || !userId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      const { data: mapping } = await supabaseAdmin.from('user_shops').select('shop_id').eq('user_id', userId).eq('shop_id', productShopId).limit(1)
      if (!mapping || mapping.length === 0) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }

      // Previously required the caller device to match the shop's authoritative device.
      // That device-level restriction has been removed.
    }

    return NextResponse.json({ data: product })
  } catch (err: unknown) {
    console.error('Product GET error', err)
    const message = err instanceof Error ? err.message : 'Server error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> | { id: string } }) {
  try {
    const resolved = (await params) as { id?: string }
    const id = resolved?.id
    const body: unknown = await req.json()
    console.error('[Products PATCH] incoming body for id', id, body)
    if (typeof body !== 'object' || body === null) return NextResponse.json({ error: 'Invalid body' }, { status: 400 })
    const { name, price, stock, barcode } = body as Record<string, unknown>

    if (!name || typeof name !== 'string') {
      return NextResponse.json({ error: 'Invalid name' }, { status: 400 })
    }

    const priceNum = Number(price || 0)
    const stockNum = Number(stock || 0)
    if (isNaN(priceNum) || isNaN(stockNum)) {
      return NextResponse.json({ error: 'Invalid numeric values' }, { status: 400 })
    }

    const supabaseAdmin = getSupabaseAdmin()

    // Ensure caller is member of the product's shop
    const { data: existingProduct } = await supabaseAdmin.from('products').select('shop_id').eq('id', id).single()
    const productShopId = (existingProduct as unknown as { shop_id?: string })?.shop_id
    if (productShopId) {
      const authHeader = req.headers.get('authorization') || ''
      if (!authHeader.startsWith('Bearer ')) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      const accessToken = authHeader.split(' ')[1]
      const { data: authData, error: authErr } = await (supabaseAdmin.auth as unknown as SupabaseAuthLike).getUser(accessToken)
      const userId = (authData as unknown as SupabaseUserData)?.user?.id
      if (authErr || !userId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      const { data: mapping } = await supabaseAdmin.from('user_shops').select('shop_id').eq('user_id', userId).eq('shop_id', productShopId).limit(1)
      if (!mapping || mapping.length === 0) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Enforce that only the authoritative device for the shop may update products
    const deviceIdFromHeader = req.headers.get('x-device-id') || null
    const deviceIdFromBody = (body as Record<string, unknown>)?.deviceId as string | undefined
    const deviceId = deviceIdFromBody ?? deviceIdFromHeader
    if (productShopId) {
      try {
        const { enforceDeviceWritePermission } = await import('@/lib/deviceAuth')
        const authHeader2 = req.headers.get('authorization') || ''
        const userToken = authHeader2.startsWith('Bearer ') ? authHeader2.split(' ')[1] : null
        const userId = userToken ? ((await (supabaseAdmin.auth as unknown as SupabaseAuthLike).getUser(userToken)).data as SupabaseUserData)?.user?.id : null
        const check = await enforceDeviceWritePermission(supabaseAdmin, productShopId ?? null, userId ?? null, deviceId ?? null)
        if (!check.allowed) return NextResponse.json({ error: check.reason || 'forbidden' }, { status: 403 })
      } catch (e) {
        return NextResponse.json({ error: 'authorization_error' }, { status: 403 })
      }
    }

    const updatePayload: Record<string, unknown> = { name, price: priceNum, stock: stockNum, barcode }
    // sanitize any accidental string 'undefined' values to null
    for (const k of Object.keys(updatePayload)) {
      if (updatePayload[k] === 'undefined') updatePayload[k] = null
    }
    console.error('[Products PATCH] updatePayload:', updatePayload)
    const { data, error } = await supabaseAdmin.from('products').update(updatePayload).eq('id', id).select('id, name, price, stock, barcode, created_at').single()
    if (error) throw error
    return NextResponse.json({ data })
  } catch (err: unknown) {
    console.error('Product PATCH error', err)
    const message = err instanceof Error ? err.message : 'Server error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> | { id: string } }) {
  try {
    const resolved = (await params) as { id?: string }
    const id = resolved?.id
    const supabaseAdmin = getSupabaseAdmin()

    // Ensure caller is member of the product's shop
    const { data: existingProduct } = await supabaseAdmin.from('products').select('shop_id').eq('id', id).single()
    const productShopId = (existingProduct as unknown as { shop_id?: string })?.shop_id
    if (productShopId) {
      const authHeader = req.headers.get('authorization') || ''
      if (!authHeader.startsWith('Bearer ')) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      const accessToken = authHeader.split(' ')[1]
      const { data: authData, error: authErr } = await (supabaseAdmin.auth as unknown as { getUser: (t: string) => Promise<{ data?: unknown; error?: unknown }> }).getUser(accessToken)
      const userId = (authData as unknown as { user?: { id?: string } })?.user?.id
      if (authErr || !userId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      const { data: mapping } = await supabaseAdmin.from('user_shops').select('shop_id').eq('user_id', userId).eq('shop_id', productShopId).limit(1)
      if (!mapping || mapping.length === 0) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

      // Enforce device authorization for deletes as well
      try {
        const deviceIdFromHeader = req.headers.get('x-device-id') || null
        const { enforceDeviceWritePermission } = await import('@/lib/deviceAuth')
        const check = await enforceDeviceWritePermission(supabaseAdmin, productShopId, userId, deviceIdFromHeader ?? null)
        if (!check.allowed) return NextResponse.json({ error: check.reason || 'forbidden' }, { status: 403 })
      } catch (e) {
        return NextResponse.json({ error: 'authorization_error' }, { status: 403 })
      }
    }
    // Check for existing references in sale_items to avoid FK violation
    const { data: refs, error: refError } = await supabaseAdmin
      .from('sale_items')
      .select('id')
      .eq('product_id', id)
      .limit(1)

    if (refError) {
      console.error('Error checking sale_items references', refError)
      throw refError
    }

    if (refs && Array.isArray(refs) && refs.length > 0) {
      return NextResponse.json({ error: 'Cannot delete product: it is referenced by existing sales.' }, { status: 400 })
    }

    const { error } = await supabaseAdmin.from('products').delete().eq('id', id)
    if (error) {
      // If Postgres returns a FK violation (unexpected), map to user-friendly message
      if ((error as unknown as { code?: string })?.code === '23503') {
        return NextResponse.json({ error: 'Cannot delete product: it is referenced by existing sales.' }, { status: 400 })
      }
      throw error
    }

    return NextResponse.json({ success: true })
  } catch (err: unknown) {
    console.error('Product DELETE error', err)
    const message = err instanceof Error ? err.message : 'Server error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
