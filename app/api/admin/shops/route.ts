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
    // Allow any authenticated user to list shops for admin UI (owner-only restriction removed)
    const callerEmail = (authData as unknown as { user?: { email?: string } })?.user?.email

    // Try selecting authoritative_device_id if present; if the column doesn't exist, retry without it.
    let shopsRes: { data?: unknown; error?: any } = await supabaseAdmin
      .from('shops')
      .select('id,name,owner_user_id,bir_disclaimer_accepted_at,bir_disclaimer_version,bir_disclaimer_approved_at,bir_disclaimer_approved_by,authoritative_device_id')
      .order('created_at', { ascending: false })

    if (shopsRes.error && (shopsRes.error?.code === '42703' || shopsRes.error?.message?.includes('authoritative_device_id'))) {
      // Column not found in this database schema; retry without the column
      shopsRes = await supabaseAdmin
        .from('shops')
        .select('id,name,owner_user_id,bir_disclaimer_accepted_at,bir_disclaimer_version,bir_disclaimer_approved_at,bir_disclaimer_approved_by')
        .order('created_at', { ascending: false })
    }

    if (shopsRes.error) throw shopsRes.error
    const shops = shopsRes.data

    // Map owner_user_id to email
    const usersRes = await (supabaseAdmin.auth as unknown as { admin: { listUsers: (opts: { per_page: number }) => Promise<{ data?: { users?: unknown[] }; error?: unknown }> } }).admin.listUsers({ per_page: 500 })
    const users = (usersRes?.data as unknown as { users?: unknown[] })?.users || []
    const userMap: Record<string, string | null> = {}
    users.forEach((u: unknown) => {
      const uu = u as unknown as Record<string, unknown>
      const id = uu?.id as string | undefined
      const email = uu?.email as string | undefined
      if (id) userMap[id] = email ?? null
    })

    const out = (Array.isArray(shops) ? shops : []).map((s: unknown) => {
      const row = s as unknown as Record<string, unknown>
      return { ...row, owner_email: userMap[(row.owner_user_id as string) || ''] || null, authoritative_device_id: row.authoritative_device_id ?? null }
    })

    return NextResponse.json({ data: out })
  } catch (err: unknown) {
    console.error('admin/shops GET error', err)
    const message = err instanceof Error ? err.message : 'Server error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
