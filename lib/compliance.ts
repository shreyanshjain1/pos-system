import { getSupabaseAdmin } from './supabase/server'

type Shop = {
  id: string
  owner_user_id: string
}

export async function parseSupabaseCookie(cookieHeader?: string) {
  if (!cookieHeader) return null
  // look for sb:token or supabase-auth-token like cookies
  const parts = cookieHeader.split(';').map(s => s.trim())
  const sb = parts.find(p => p.startsWith('sb:token=')) || parts.find(p => p.startsWith('supabase-auth-token='))
  if (!sb) return null
  const idx = sb.indexOf('=')
  const val = decodeURIComponent(sb.slice(idx + 1))
  try {
    const parsed = JSON.parse(val)
    // common shapes: { "access_token": "...", "user": { id } } or { currentSession: { access_token, user } }
    const access_token = parsed.access_token ?? parsed.currentSession?.access_token
    const user = parsed.user ?? parsed.currentSession?.user
    return { access_token, user }
  } catch (e) {
    return null
  }
}

export async function getCurrentUserAndShopFromCookie(cookieHeader?: string) {
  const admin = getSupabaseAdmin()
  const parsed = await parseSupabaseCookie(cookieHeader)
  if (!parsed || !parsed.user) return null
  const userId = parsed.user.id

  // find or create shop for user
  const { data: shops } = await admin
    .from('shops')
    .select('*')
    .eq('owner_user_id', userId)
    .limit(1)

  if (shops && shops.length > 0) {
    return { user: parsed.user, shop: shops[0] as Shop }
  }

  // create a default shop
  const { data: newShop, error } = await admin
    .from('shops')
    .insert({ owner_user_id: userId, shop_name: `${parsed.user.email ?? 'My Shop'}` })
    .select('*')
    .limit(1)

  if (error) return { user: parsed.user, shop: null }
  return { user: parsed.user, shop: (newShop && newShop[0]) || null }
}

export async function hasAcceptedBirDisclaimer(owner_user_id: string, shop_id: string) {
  const admin = getSupabaseAdmin()
  const { data } = await admin
    .from('compliance_acceptances')
    .select('*')
    .eq('owner_user_id', owner_user_id)
    .eq('shop_id', shop_id)
    .order('accepted_at', { ascending: false })
    .limit(1)

  if (data && data.length > 0) return true

  // fallback to shops flag
  const { data: shops } = await admin.from('shops').select('bir_disclaimer_accepted_at').eq('id', shop_id).limit(1)
  if (shops && shops.length > 0 && shops[0].bir_disclaimer_accepted_at) return true
  return false
}

export async function hasBirApproved(shop_id: string) {
  const admin = getSupabaseAdmin()
  const { data: shops } = await admin.from('shops').select('bir_disclaimer_approved_at').eq('id', shop_id).limit(1)
  if (shops && shops.length > 0 && shops[0].bir_disclaimer_approved_at) return true
  return false
}
