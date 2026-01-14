import { supabase } from './supabase/client'
import getSupabaseAdmin from './supabase/server'

export type Shop = {
  id: string
  owner_user_id: string
  shop_name: string
  plan: string
  pos_type: string
  pos_type_selected_at: string | null
}

const ADMIN = getSupabaseAdmin()

export async function getShopForUserOrCreate(userId: string) {
  // Try to load existing shop
  const { data, error } = await ADMIN.from('shops').select('*').eq('owner_user_id', userId).limit(1).maybeSingle()
  if (error) throw error
  if (data) return data as Shop

  // Create a new shop with defaults
  const insert = {
    owner_user_id: userId,
    shop_name: 'My Shop',
    plan: 'basic',
    pos_type: '',
  }
  const { data: created, error: createErr } = await ADMIN.from('shops').insert(insert).select().maybeSingle()
  if (createErr) throw createErr
  return created as Shop
}

export async function setPosTypeOnce(shopId: string, posType: string) {
  // Only update when pos_type is empty to enforce one-time set
  const { data, error } = await ADMIN.from('shops')
    .update({ pos_type: posType, pos_type_selected_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq('id', shopId)
    .eq('pos_type', '')
    .select()
    .maybeSingle()

  if (error) throw error
  return data as Shop | null
}

export default getShopForUserOrCreate
