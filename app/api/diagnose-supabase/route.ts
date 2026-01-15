import { NextResponse } from 'next/server'
import { getSupabaseAdmin } from '../../../lib/supabase/server'

export async function GET() {
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL || null
    const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'present' : 'missing'
    const service = process.env.SUPABASE_SERVICE_ROLE_KEY ? 'present' : 'missing'

    const admin = getSupabaseAdmin()
    // simple test: try selecting from a known table using the service role client
    // this verifies DB connectivity and permissions
    const { data, error } = await admin.from('shops').select('id').limit(1)
    return NextResponse.json({ ok: true, url: Boolean(url), anon, service, shopsSample: data ?? null, shopsError: error ?? null })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ ok: false, error: message }, { status: 500 })
  }
}
