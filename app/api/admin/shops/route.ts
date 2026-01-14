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
    const { data: authData, error: authErr } = await (supabaseAdmin.auth as any).getUser(accessToken)
    if (authErr) throw authErr
    const callerEmail = (authData as any)?.user?.email
    if (!isOwnerEmail(callerEmail)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { data: shops, error: shopsErr } = await supabaseAdmin.from('shops').select('id,name,owner_user_id,bir_disclaimer_accepted_at,bir_disclaimer_version,bir_disclaimer_approved_at,bir_disclaimer_approved_by').order('created_at', { ascending: false })
    if (shopsErr) throw shopsErr

    // Map owner_user_id to email
    const usersRes = await (supabaseAdmin.auth as any).admin.listUsers({ per_page: 500 })
    const users = usersRes?.data?.users || []
    const userMap: Record<string, string | null> = {}
    users.forEach((u: any) => { userMap[u.id] = u.email || null })

    const out = (shops || []).map((s: any) => ({ ...s, owner_email: userMap[s.owner_user_id] || null }))

    return NextResponse.json({ data: out })
  } catch (err: any) {
    console.error('admin/shops GET error', err)
    return NextResponse.json({ error: err?.message || 'Server error' }, { status: 500 })
  }
}
