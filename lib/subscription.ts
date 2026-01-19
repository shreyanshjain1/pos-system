import { SupabaseClient } from '@supabase/supabase-js'

export async function getSubscriptionStatus(supabaseAdmin: SupabaseClient, userId: string) {
  if (!userId) return { active: false, reason: 'no_user' }
  try {
    const { data, error } = await supabaseAdmin
      .from('user_subscriptions')
      .select('plan, expiry_date, pos_type')
      .eq('user_id', userId)
      .maybeSingle()

    if (error) return { active: false, reason: 'db_error' }
    if (!data || !data.plan) return { active: false, reason: 'no_plan', pos_type: data?.pos_type ?? null }
    const rawExpiry = data.expiry_date
    let expiry: number | null = null
    if (rawExpiry) {
      // If expiry is date-only (YYYY-MM-DD), treat it as end of that day (inclusive)
      if (/^\d{4}-\d{2}-\d{2}$/.test(String(rawExpiry))) {
        const d = new Date(String(rawExpiry) + 'T23:59:59.999Z')
        expiry = d.getTime()
      } else {
        expiry = new Date(String(rawExpiry)).getTime()
      }
    }

    if (!expiry || expiry <= Date.now()) return { active: false, reason: 'expired', expiry_date: data.expiry_date, pos_type: data.pos_type ?? null }
    // normalize plan to lowercase and accept 'advanced' alias for 'advance'
    const planRaw = String(data.plan || '').toLowerCase()
    const planNorm = planRaw === 'advanced' ? 'advance' : planRaw
    return { active: true, plan: planNorm, expiry_date: data.expiry_date, pos_type: data.pos_type ?? null }
  } catch (e) {
    return { active: false, reason: 'error' }
  }
}

export function getDeviceLimitForPlan(plan?: string | null) {
  // Define device limits per plan
  switch ((plan || '').toLowerCase()) {
    case 'pro':
      return 3
    case 'advance':
      return 10
    case 'basic':
    default:
      return 1
  }
}
