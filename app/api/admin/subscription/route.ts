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
    const { data: authData, error: authErr } = await (supabaseAdmin.auth as any).getUser(accessToken)
    if (authErr) throw authErr
    const callerEmail = (authData as any)?.user?.email
    if (!isOwnerEmail(callerEmail)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await req.json().catch(() => ({}))
    const user_id = body?.user_id
    const plan = body?.plan ?? null
    const expiry_date = body?.expiry_date ?? null

    if (!user_id) return NextResponse.json({ error: 'Missing user_id' }, { status: 400 })

    // Upsert subscription: since `user_id` may not have a unique constraint,
    // perform select -> update or insert to avoid ON CONFLICT errors.
    const payload: any = { user_id, plan: plan, expiry_date: expiry_date }

    // check if a subscription exists for this user
    const { data: existing, error: selectErr } = await supabaseAdmin
      .from('user_subscriptions')
      .select('id')
      .eq('user_id', user_id)
      .maybeSingle()

    if (selectErr) {
      throw selectErr
    }

    let resData: any = null
    if (existing && existing.id) {
      const { data: updated, error: updateErr } = await supabaseAdmin
        .from('user_subscriptions')
        .update({ plan: payload.plan, expiry_date: payload.expiry_date })
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
  } catch (err: any) {
    console.error('admin/subscription POST error', err)
    return NextResponse.json({ error: err?.message || 'Server error' }, { status: 500 })
  }
}
