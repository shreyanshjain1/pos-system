import { NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase/server'

export async function POST(req: Request) {
  try {
    const body: unknown = await req.json()
    const code = (typeof body === 'object' && body !== null) ? (body as any).code : null
    if (!code) return NextResponse.json({ error: 'Missing code' }, { status: 400 })

    const supabaseAdmin = getSupabaseAdmin()
    // Determine user's mapped shops
    const authHeader = req.headers.get('authorization') || ''
    let shopIds: string[] = []
    if (authHeader.startsWith('Bearer ')) {
      const accessToken = authHeader.split(' ')[1]
      try {
        const { data: authData } = await (supabaseAdmin.auth as any).getUser(accessToken)
        const userId = authData?.user?.id
        if (userId) {
          const { data: mappings } = await supabaseAdmin.from('user_shops').select('shop_id').eq('user_id', userId)
          shopIds = (mappings || []).map((m: any) => m.shop_id).filter(Boolean)
        }
      } catch (e) { console.warn('barcode lookup: token invalid', e) }
    }
    if (shopIds.length === 0) return NextResponse.json({ error: 'No shop mapping' }, { status: 403 })

    const { data, error } = await supabaseAdmin
      .from('barcodes')
      .select('code, product:products(id,name,price,stock)')
      .in('shop_id', shopIds)
      .eq('code', String(code)).limit(1).maybeSingle()

    if (error) throw error
    if (!data) return NextResponse.json({ data: null })
    return NextResponse.json({ data })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Server error'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
