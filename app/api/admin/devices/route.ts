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

    // Simple, schema-agnostic fetch: return all rows from `user_devices`.
    const { data: devices, error: devErr } = await supabaseAdmin.from('user_devices').select('*').order('last_seen', { ascending: false })
    if (devErr) {
      console.error('admin/devices fetch error', devErr)
      throw devErr
    }

    // Map user IDs to emails using the Admin API (small userbases expected)
    const usersRes = await (supabaseAdmin.auth as unknown as { admin: { listUsers: (opts: { per_page: number }) => Promise<{ data?: { users?: unknown[] }; error?: unknown }> } }).admin.listUsers({ per_page: 500 })
    if (usersRes?.error) {
      console.warn('admin/devices: failed to list users for email mapping', usersRes.error)
    }
    const users = (usersRes?.data as unknown as { users?: unknown[] })?.users || []
    const userMap: Record<string, string | null> = {}
    users.forEach((u: unknown) => {
      const uu = u as unknown as Record<string, unknown>
      const id = uu?.id as string | undefined
      const email = uu?.email as string | undefined
      if (id) userMap[id] = email ?? null
    })

    const out = (devices || []).map((d: unknown) => {
      const row = d as unknown as Record<string, unknown>
      return { ...row, email: userMap[(row.user_id as string) || ''] || null }
    })

    return NextResponse.json({ data: out })
  } catch (err: unknown) {
    console.error('admin/devices GET error', err)
    const message = err instanceof Error ? err.message : 'Server error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
