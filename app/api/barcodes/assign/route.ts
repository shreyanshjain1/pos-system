import { NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase/server'

export async function POST(req: Request) {
  try {
    const body: unknown = await req.json()
    if (typeof body !== 'object' || body === null) return NextResponse.json({ error: 'Invalid body' }, { status: 400 })
    const { shop_id, device_id, code, product_id } = body as Record<string, unknown>
    if (!shop_id || !device_id || !code || !product_id) return NextResponse.json({ error: 'Missing fields' }, { status: 400 })

    const supabaseAdmin = getSupabaseAdmin()
    // Enforce device authorization for write actions
    try {
      const { enforceDeviceWritePermission } = await import('@/lib/deviceAuth')
      // determine caller user if token present
      const authHeader = req.headers.get('authorization') || ''
      let userId: string | null = null
      if (authHeader.startsWith('Bearer ')) {
        try {
          const { data: authData } = await (supabaseAdmin.auth as any).getUser(authHeader.split(' ')[1])
          userId = (authData as any)?.user?.id ?? null
        } catch (_) {}
      }
      const check = await enforceDeviceWritePermission(supabaseAdmin, String(shop_id), userId, String(device_id))
      if (!check.allowed) return NextResponse.json({ error: check.reason || 'forbidden' }, { status: 403 })
    } catch (e) {
      return NextResponse.json({ error: 'authorization_error' }, { status: 403 })
    }

    // insert barcode mapping with unique constraint enforcement
    const payload = { shop_id, product_id, code: String(code), device_id: String(device_id) }
    const { data, error } = await supabaseAdmin.from('barcodes').insert([payload]).select('*').maybeSingle()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ data }, { status: 201 })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Server error'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
