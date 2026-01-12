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
    // Require a shop mapping for checkout
    if (!shopId) return NextResponse.json({ error: 'No shop mapping' }, { status: 403 })

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

    return NextResponse.json({ data })
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Server error' }, { status: 500 })
  }
}
