import { NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase/server'

const OWNER_EMAIL = 'raymart.leyson.rl@gmail.com'
function isOwnerEmail(email?: string | null) {
  if (!email) return false
  return email.toLowerCase().trim() === OWNER_EMAIL.toLowerCase()
}

export async function GET(req: Request) {
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

    // List users via admin API
    const usersRes = await (supabaseAdmin.auth as unknown as { admin: { listUsers: (opts: { per_page: number }) => Promise<{ data?: { users?: unknown[] }; error?: unknown }> } }).admin.listUsers({ per_page: 100 })
    if (usersRes?.error) throw usersRes.error
    const users = (usersRes?.data as unknown as { users?: unknown[] })?.users || []

    // Try to fetch subscription records if table exists
    const userIds = (users as unknown[]).map((u: unknown) => (u as unknown as { id?: string })?.id).filter(Boolean) as string[]
    const subsMap: Record<string, unknown> = {}
    try {
      const { data: subs, error: subsErr } = await supabaseAdmin
        .from('user_subscriptions')
        .select('user_id, plan, expiry_date')
        .in('user_id', userIds)

      if (!subsErr && Array.isArray(subs)) {
        subs.forEach((s: unknown) => {
          const ss = s as unknown as Record<string, unknown>
          const uid = ss?.user_id as string | undefined
          if (uid) subsMap[uid] = ss
        })
      }
    } catch (e) {
      // ignore if table doesn't exist
    }
    const out = (users as unknown[]).map((u: unknown) => {
      const uu = u as unknown as Record<string, unknown>
      const id = uu?.id as string | undefined
      const app_meta = (uu?.user_metadata ?? uu?.raw_user_meta_data) ?? null
      const subs = id ? (subsMap[id] as unknown as Record<string, unknown> | undefined) : undefined
      return {
        id,
        email: uu?.email as string | undefined,
        created_at: uu?.created_at as string | undefined,
        phone: uu?.phone as string | undefined,
        app_meta,
        plan: subs?.plan ?? null,
        expiry_date: subs?.expiry_date ?? null,
      }
    })

    return NextResponse.json({ data: out })
  } catch (err: unknown) {
    console.error('admin/users GET error', err)
    const message = err instanceof Error ? err.message : 'Server error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
