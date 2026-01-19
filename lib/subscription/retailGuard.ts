import { getSupabaseAdmin } from '@/lib/supabase/server'

type RetailGuardResult = {
  shop: Record<string, any> | null
  subscription: Record<string, any> | null
  allowed: boolean
  reason?: string
}

export async function getRetailShopAndSubscriptionByStoreName(storeName: string): Promise<RetailGuardResult> {
  const supabase = getSupabaseAdmin()
  try {
    const { data: shop, error: shopErr } = await supabase.from('shops').select('*').eq('store_name', storeName).maybeSingle()
    if (shopErr) return { shop: null, subscription: null, allowed: false, reason: 'db_error' }
    if (!shop) return { shop: null, subscription: null, allowed: false, reason: 'shop_not_found' }

    const ownerId = shop.owner_user_id as string | undefined
    if (!ownerId) return { shop, subscription: null, allowed: false, reason: 'no_owner' }

    const { data: sub, error: subErr } = await supabase.from('user_subscriptions').select('plan,pos_type,expiry_date,status').eq('user_id', ownerId).maybeSingle()
    if (subErr) return { shop, subscription: null, allowed: false, reason: 'db_error' }
    if (!sub) return { shop, subscription: null, allowed: false, reason: 'no_subscription' }

    // enforce pos_type == 'retail'
    if ((sub.pos_type || '').toLowerCase() !== 'retail') return { shop, subscription: sub, allowed: false, reason: 'not_retail' }

    // optional status field
    if (sub.status && String(sub.status).toLowerCase() !== 'active') return { shop, subscription: sub, allowed: false, reason: 'subscription_inactive' }

    const rawExpiry = sub.expiry_date
    let expiry: number | null = null
    if (rawExpiry) {
      if (/^\d{4}-\d{2}-\d{2}$/.test(String(rawExpiry))) {
        expiry = new Date(String(rawExpiry) + 'T23:59:59.999Z').getTime()
      } else {
        expiry = new Date(String(rawExpiry)).getTime()
      }
    }
    if (!expiry || expiry <= Date.now()) return { shop, subscription: sub, allowed: false, reason: 'expired' }

    // normalize plan name for consistency
    if (sub.plan && String(sub.plan).toLowerCase() === 'advanced') sub.plan = 'advance'

    return { shop, subscription: sub, allowed: true }
  } catch (e) {
    return { shop: null, subscription: null, allowed: false, reason: 'error' }
  }
}

export async function getRetailShopAndSubscriptionByShopId(shopId: string): Promise<RetailGuardResult> {
  const supabase = getSupabaseAdmin()
  try {
    const { data: shop, error: shopErr } = await supabase.from('shops').select('*').eq('id', shopId).maybeSingle()
    if (shopErr) return { shop: null, subscription: null, allowed: false, reason: 'db_error' }
    if (!shop) return { shop: null, subscription: null, allowed: false, reason: 'shop_not_found' }

    const ownerId = shop.owner_user_id as string | undefined
    if (!ownerId) return { shop, subscription: null, allowed: false, reason: 'no_owner' }

    const { data: sub, error: subErr } = await supabase.from('user_subscriptions').select('plan,pos_type,expiry_date,status').eq('user_id', ownerId).maybeSingle()
    if (subErr) return { shop, subscription: null, allowed: false, reason: 'db_error' }
    if (!sub) return { shop, subscription: null, allowed: false, reason: 'no_subscription' }

    if ((sub.pos_type || '').toLowerCase() !== 'retail') return { shop, subscription: sub, allowed: false, reason: 'not_retail' }
    if (sub.status && String(sub.status).toLowerCase() !== 'active') return { shop, subscription: sub, allowed: false, reason: 'subscription_inactive' }
    const expiry = sub.expiry_date ? new Date(sub.expiry_date).getTime() : null
    if (!expiry || expiry <= Date.now()) return { shop, subscription: sub, allowed: false, reason: 'expired' }

    return { shop, subscription: sub, allowed: true }
  } catch (e) {
    return { shop: null, subscription: null, allowed: false, reason: 'error' }
  }
}

export default getRetailShopAndSubscriptionByStoreName
