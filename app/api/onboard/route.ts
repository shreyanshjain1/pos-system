import { NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase/server'
import { randomUUID } from 'crypto'

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { user_id, shop_name } = body
    if (!user_id || !shop_name) {
      return NextResponse.json({ error: 'user_id and shop_name required' }, { status: 400 })
    }

    // Ensure request is authenticated and the token matches the provided user_id
    const authHeader = req.headers.get('authorization') || ''
    if (!authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Missing authorization token' }, { status: 401 })
    }
    const accessToken = authHeader.split(' ')[1]

    const supabaseAdmin = getSupabaseAdmin()

    // Validate access token and ensure caller is the same user
    try {
      // supabaseAdmin.auth.getUser accepts an access token and returns the user
      // (This uses the server client with service role key to inspect the token.)
      const { data: authData, error: authErr } = await (supabaseAdmin.auth as any).getUser(accessToken)
      if (authErr) throw authErr
      const tokenUserId = (authData as any)?.user?.id
      if (!tokenUserId || tokenUserId !== user_id) {
        return NextResponse.json({ error: 'Token user mismatch' }, { status: 403 })
      }
    } catch (err: any) {
      console.error('Token validation failed', err)
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    // Check if the user already has a shop mapping
    const { data: existing, error: existingErr } = await supabaseAdmin
      .from('user_shops')
      .select('shop_id')
      .eq('user_id', user_id)
      .limit(1)

    if (existingErr) throw existingErr

    if (existing && existing.length > 0) {
      // return the existing shop
      const shopId = existing[0].shop_id
      const { data: shop } = await supabaseAdmin.from('shops').select('*').eq('id', shopId).single()
      return NextResponse.json({ shop })
    }

    // Create a new shop
      const shopId = randomUUID()
      const { data: shopData, error: shopErr } = await supabaseAdmin
        .from('shops')
        .insert({ id: shopId, name: shop_name, owner_user_id: user_id })
        .select('*')
        .single()

    if (shopErr) throw shopErr

    // Map user to shop as owner
    const { data: mapData, error: mapErr } = await supabaseAdmin
      .from('user_shops')
      .insert({ user_id, shop_id: (shopData as any).id, role: 'owner' })
      .select('*')
      .single()

    if (mapErr) throw mapErr

    return NextResponse.json({ shop: shopData })
  } catch (err: any) {
    console.error('Onboard error', err)
    return NextResponse.json({ error: err?.message || 'Server error' }, { status: 500 })
  }
}
