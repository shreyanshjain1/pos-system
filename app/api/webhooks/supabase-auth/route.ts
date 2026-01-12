import { NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase/server'
import crypto from 'crypto'

// Supabase Auth webhooks can be configured to POST to this endpoint when users are created.
// Set SUPABASE_WEBHOOK_SECRET in your project to verify the request signature.

export async function POST(req: Request) {
  try {
    const raw = await req.text()

    const secret = process.env.SUPABASE_WEBHOOK_SECRET
    const sig = req.headers.get('x-supabase-signature') || req.headers.get('x-signature') || ''

    if (secret) {
      if (!sig) return NextResponse.json({ error: 'Missing signature' }, { status: 401 })
      const expected = crypto.createHmac('sha256', secret).update(raw).digest('hex')
      if (!crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(sig))) {
        return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
      }
    }

    const payload = JSON.parse(raw || '{}')

    // Support multiple payload shapes that Supabase may send
    const user = payload?.user || payload?.record || payload?.data?.user || payload?.data
    const event = payload?.type || payload?.event || payload?.trigger || payload?.action

    if (!user || !user?.id) {
      return NextResponse.json({ error: 'No user in webhook payload' }, { status: 400 })
    }

    // Only handle user created events
    const createdEvents = new Set(['user.created', 'USER_CREATED', 'user_created', 'created'])
    if (!createdEvents.has(String(event))) {
      // If event not explicitly 'created', still attempt for safety if user exists
    }

    const supabaseAdmin = getSupabaseAdmin()

    const userId = user.id

    // If user already has a mapping, return early
    const { data: existing, error: existingErr } = await supabaseAdmin
      .from('user_shops')
      .select('shop_id')
      .eq('user_id', userId)
      .limit(1)

    if (existingErr) {
      console.error('Webhook: user_shops lookup error', existingErr)
      return NextResponse.json({ error: 'Lookup failed' }, { status: 500 })
    }

    if (existing && existing.length > 0) {
      return NextResponse.json({ ok: true })
    }

    // Create a default shop. Prefer metadata.name or email as fallback
    const shopName = (user?.user_metadata?.store_name) || (user?.email) || 'My Shop'

    const { data: shopData, error: shopErr } = await supabaseAdmin
      .from('shops')
      .insert({ name: shopName, owner_user_id: userId })
      .select('*')
      .single()

    if (shopErr) {
      console.error('Webhook: create shop error', shopErr)
      return NextResponse.json({ error: 'Create shop failed' }, { status: 500 })
    }

    const { data: mapData, error: mapErr } = await supabaseAdmin
      .from('user_shops')
      .insert({ user_id: userId, shop_id: (shopData as any).id, role: 'owner' })
      .select('*')
      .single()

    if (mapErr) {
      console.error('Webhook: create mapping error', mapErr)
      return NextResponse.json({ error: 'Create mapping failed' }, { status: 500 })
    }

    return NextResponse.json({ ok: true, shop: shopData })
  } catch (err: any) {
    console.error('Supabase webhook handler error', err)
    return NextResponse.json({ error: err?.message || 'Server error' }, { status: 500 })
  }
}

// Use the Node.js runtime for this webhook because it needs the built-in `crypto` module
export const runtime = 'nodejs'
