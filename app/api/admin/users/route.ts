import { NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase/server'

const OWNER_EMAIL = 'raymart.leyson.rl@gmail.com'

export async function GET(req: Request) {
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
    if (!callerEmail || callerEmail !== OWNER_EMAIL) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // List users via admin API
    const usersRes = await (supabaseAdmin.auth as any).admin.listUsers({ per_page: 100 })
    if (usersRes?.error) throw usersRes.error
    const users = (usersRes?.data?.users || []) as any[]

    // Try to fetch subscription records if table exists
    const userIds = users.map((u) => u.id)
    let subsMap: Record<string, any> = {}
    try {
      const { data: subs, error: subsErr } = await supabaseAdmin
        .from('user_subscriptions')
        .select('user_id, plan, expiry_date')
        .in('user_id', userIds)

      if (!subsErr && Array.isArray(subs)) {
        subs.forEach((s: any) => {
          subsMap[s.user_id] = s
        })
      }
    } catch (e) {
      // ignore if table doesn't exist
    }

    const out = users.map((u) => ({
      id: u.id,
      email: u.email,
      created_at: u.created_at,
      phone: u.phone,
      app_meta: u.user_metadata || u.raw_user_meta_data || null,
      plan: subsMap[u.id]?.plan || null,
      expiry_date: subsMap[u.id]?.expiry_date || null
    }))

    return NextResponse.json({ data: out })
  } catch (err: any) {
    console.error('admin/users GET error', err)
    return NextResponse.json({ error: err?.message || 'Server error' }, { status: 500 })
  }
}
