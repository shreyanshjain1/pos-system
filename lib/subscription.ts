import { SupabaseClient } from '@supabase/supabase-js'

export async function getSubscriptionStatus(supabaseAdmin: SupabaseClient, userId: string) {
  if (!userId) return { active: false, reason: 'no_user' }
  try {
    const { data, error } = await supabaseAdmin
      .from('user_subscriptions')
      .select('plan, expiry_date')
      .eq('user_id', userId)
      .maybeSingle()

    if (error) return { active: false, reason: 'db_error' }
    if (!data || !data.plan) return { active: false, reason: 'no_plan' }
    const expiry = data.expiry_date ? new Date(data.expiry_date).getTime() : null
    if (!expiry || expiry <= Date.now()) return { active: false, reason: 'expired', expiry_date: data.expiry_date }
    return { active: true, plan: data.plan, expiry_date: data.expiry_date }
  } catch (e) {
    return { active: false, reason: 'error' }
  }
}
