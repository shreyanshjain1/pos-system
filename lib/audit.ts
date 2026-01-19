import { getSupabaseAdmin } from '@/lib/supabase/server'

export async function writeAuditLog(payload: { shop_id?: string; user_id?: string; action: string; meta?: Record<string, any> }) {
  try {
    const supabase = getSupabaseAdmin()
    await supabase.from('audit_logs').insert([{ ...payload, created_at: new Date().toISOString() }])
  } catch (e) {
    console.warn('writeAuditLog failed (non-fatal)', e)
  }
}

export default { writeAuditLog }
