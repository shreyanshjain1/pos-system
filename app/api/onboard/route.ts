import { NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase/server'
import { randomUUID } from 'crypto'

export async function POST(req: Request) {
  try {
    const body: unknown = await req.json().catch(() => ({} as unknown))
    const bodyRec = body as unknown as Record<string, unknown>
    const user_id = bodyRec?.user_id as string | undefined
    const shop_name = bodyRec?.shop_name as string | undefined
    const pos_type = bodyRec?.pos_type as string | undefined
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
      const { data: authData, error: authErr } = await (supabaseAdmin.auth as unknown as { getUser: (t: string) => Promise<{ data?: unknown; error?: unknown }> }).getUser(accessToken)
      if (authErr) throw authErr
      const tokenUserId = (authData as unknown as { user?: { id?: string } })?.user?.id
      if (!tokenUserId || tokenUserId !== user_id) {
        return NextResponse.json({ error: 'Token user mismatch' }, { status: 403 })
      }
    } catch (err: unknown) {
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
      const shopId = (existing[0] as unknown as { shop_id?: string })?.shop_id
      const { data: shop } = await supabaseAdmin.from('shops').select('*').eq('id', shopId).single()
      return NextResponse.json({ shop })
    }

    // Ensure shop name is not already taken (case-insensitive)
    const { data: existingByName, error: nameErr } = await supabaseAdmin
      .from('shops')
      .select('id, name')
      .ilike('name', shop_name)
      .limit(1)

    if (nameErr) throw nameErr
    if (existingByName && existingByName.length > 0) {
      return NextResponse.json({ error: 'Shop name already taken' }, { status: 409 })
    }

    // Create a new shop (include pos_type when provided)
    const shopId = randomUUID()
    const insertObj: Record<string, unknown> = { id: shopId, name: shop_name, owner_user_id: user_id }
    if (pos_type && pos_type !== '') {
      insertObj.pos_type = pos_type
      insertObj.pos_type_selected_at = new Date().toISOString()
    }
    const { data: shopData, error: shopErr } = await supabaseAdmin
      .from('shops')
      .insert(insertObj)
      .select('*')
      .single()

    if (shopErr) throw shopErr

    // Map user to shop as owner
    const { data: mapData, error: mapErr } = await supabaseAdmin
      .from('user_shops')
      .insert({ user_id, shop_id: (shopData as unknown as { id?: string })?.id, role: 'owner' })
      .select('*')
      .single()

    if (mapErr) throw mapErr

    return NextResponse.json({ shop: shopData })
  } catch (err: unknown) {
    console.error('Onboard error', err)
    const message = err instanceof Error ? err.message : 'Server error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
