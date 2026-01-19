import { NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase/server'

const OWNER_EMAIL = 'raymart.leyson.rl@gmail.com'
function isOwnerEmail(email?: string | null) {
  if (!email) return false
  return email.toLowerCase().trim() === OWNER_EMAIL.toLowerCase()
}

export async function POST(req: Request) {
  try {
    const authHeader = req.headers.get('authorization') || ''
    if (!authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Missing authorization token' }, { status: 401 })
    }
    const accessToken = authHeader.split(' ')[1]

    const supabaseAdmin = getSupabaseAdmin()

    // Validate token and get caller
    const { data: authData, error: authErr } = await (supabaseAdmin.auth as unknown as { getUser: (t: string) => Promise<{ data?: unknown; error?: unknown }> }).getUser(accessToken)
    if (authErr) throw authErr
    const callerEmail = (authData as unknown as { user?: { email?: string } })?.user?.email
    if (!isOwnerEmail(callerEmail)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body: unknown = await req.json().catch(() => ({} as unknown))
    const bodyRec = body as unknown as Record<string, unknown>
    const id = bodyRec?.id as string | undefined
    let user_id = bodyRec?.user_id as string | undefined
    const shop_name = bodyRec?.shop_name as string | undefined
    const plan = bodyRec?.plan ?? null
    const expiry_date = bodyRec?.expiry_date ?? null
    const pos_type = bodyRec?.pos_type ?? null

    // If caller provided a shop name instead of a user_id, resolve owner_user_id from shops
    if (!user_id && shop_name) {
      try {
        const { data: shopRec, error: shopErr } = await supabaseAdmin
          .from('shops')
          .select('owner_user_id')
          .eq('name', shop_name)
          .maybeSingle()

        if (shopErr) throw shopErr
        const owner = (shopRec as unknown as { owner_user_id?: string })?.owner_user_id
        if (owner) user_id = owner
      } catch (e) {
        console.warn('admin/subscription: shop lookup failed', e)
      }
    }

    if (!user_id) return NextResponse.json({ error: 'Missing user_id (or shop_name not found)' }, { status: 400 })

    // Upsert subscription: since `user_id` may not have a unique constraint,
    // perform select -> update or insert to avoid ON CONFLICT errors.
    const payload: Record<string, unknown> = { user_id, plan: plan, expiry_date: expiry_date, pos_type }

    // check if a subscription exists for this user
    const { data: existing, error: selectErr } = await supabaseAdmin
      .from('user_subscriptions')
      .select('id')
      .eq('user_id', user_id)
      .maybeSingle()

    if (selectErr) {
      throw selectErr
    }

    let resData: unknown = null
    if (existing && (existing as unknown as { id?: string }).id) {
      const { data: updated, error: updateErr } = await supabaseAdmin
        .from('user_subscriptions')
        .update({ plan: payload.plan, expiry_date: payload.expiry_date, pos_type: payload.pos_type })
        .eq('user_id', user_id)
        .select()

      if (updateErr) throw updateErr
      resData = updated
    } else {
      const { data: inserted, error: insertErr } = await supabaseAdmin
        .from('user_subscriptions')
        .insert([payload])
        .select()

      if (insertErr) throw insertErr
      resData = inserted
    }

    return NextResponse.json({ data: resData })
  } catch (err: unknown) {
    console.error('admin/subscription POST error', err)
    const message = err instanceof Error ? err.message : 'Server error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
