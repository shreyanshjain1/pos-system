import { NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase/server'

export async function GET(req: Request, { params }: { params: any }) {
  try {
    const { id } = await params
    const supabaseAdmin = getSupabaseAdmin()

    const { data, error } = await supabaseAdmin.from('products').select('id, name, price, stock, barcode, shop_id, created_at').eq('id', id).single()
    if (error) throw error

    const product = data as any
    // Product MUST have a shop_id and caller must be a member of that shop
    if (!product?.shop_id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    if (product?.shop_id) {
      const authHeader = req.headers.get('authorization') || ''
      if (!authHeader.startsWith('Bearer ')) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
      const accessToken = authHeader.split(' ')[1]
      const { data: authData, error: authErr } = await (supabaseAdmin.auth as any).getUser(accessToken)
      if (authErr || !authData?.user?.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      const userId = authData.user.id
      const { data: mapping } = await supabaseAdmin.from('user_shops').select('shop_id').eq('user_id', userId).eq('shop_id', product.shop_id).limit(1)
      if (!mapping || mapping.length === 0) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
    }

    return NextResponse.json({ data: product })
  } catch (err: any) {
    console.error('Product GET error', err)
    return NextResponse.json({ error: err?.message || 'Server error' }, { status: 500 })
  }
}

export async function PATCH(req: Request, { params }: { params: any }) {
  try {
    const { id } = await params
    const body = await req.json()
    console.error('[Products PATCH] incoming body for id', id, body)
    const { name, price, stock, barcode } = body

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
    const productShopId = (existingProduct as any)?.shop_id
    if (productShopId) {
      const authHeader = req.headers.get('authorization') || ''
      if (!authHeader.startsWith('Bearer ')) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      const accessToken = authHeader.split(' ')[1]
      const { data: authData, error: authErr } = await (supabaseAdmin.auth as any).getUser(accessToken)
      if (authErr || !authData?.user?.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      const userId = authData.user.id
      const { data: mapping } = await supabaseAdmin.from('user_shops').select('shop_id').eq('user_id', userId).eq('shop_id', productShopId).limit(1)
      if (!mapping || mapping.length === 0) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const updatePayload: any = { name, price: priceNum, stock: stockNum, barcode }
    // sanitize any accidental string 'undefined' values to null
    for (const k of Object.keys(updatePayload)) {
      if (updatePayload[k] === 'undefined') updatePayload[k] = null
    }
    console.error('[Products PATCH] updatePayload:', updatePayload)
    const { data, error } = await supabaseAdmin.from('products').update(updatePayload).eq('id', id).select('id, name, price, stock, barcode, created_at').single()
    if (error) throw error
    return NextResponse.json({ data })
  } catch (err: any) {
    console.error('Product PATCH error', err)
    return NextResponse.json({ error: err?.message || 'Server error' }, { status: 500 })
  }
}

export async function DELETE(req: Request, { params }: { params: any }) {
  try {
    const { id } = await params
    const supabaseAdmin = getSupabaseAdmin()

    // Ensure caller is member of the product's shop
    const { data: existingProduct } = await supabaseAdmin.from('products').select('shop_id').eq('id', id).single()
    const productShopId = (existingProduct as any)?.shop_id
    if (productShopId) {
      const authHeader = req.headers.get('authorization') || ''
      if (!authHeader.startsWith('Bearer ')) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      const accessToken = authHeader.split(' ')[1]
      const { data: authData, error: authErr } = await (supabaseAdmin.auth as any).getUser(accessToken)
      if (authErr || !authData?.user?.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      const userId = authData.user.id
      const { data: mapping } = await supabaseAdmin.from('user_shops').select('shop_id').eq('user_id', userId).eq('shop_id', productShopId).limit(1)
      if (!mapping || mapping.length === 0) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
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
      if (error.code === '23503') {
        return NextResponse.json({ error: 'Cannot delete product: it is referenced by existing sales.' }, { status: 400 })
      }
      throw error
    }

    return NextResponse.json({ success: true })
  } catch (err: any) {
    console.error('Product DELETE error', err)
    return NextResponse.json({ error: err?.message || 'Server error' }, { status: 500 })
  }
}
