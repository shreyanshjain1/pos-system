import { SupabaseClient } from '@supabase/supabase-js'

type AuthCheckResult = {
  allowed: boolean
  reason?: string
  isAdmin?: boolean
  bypassed?: boolean
}

export async function getUserRoleForShop(supabaseAdmin: SupabaseClient, userId: string, shopId: string): Promise<string | null> {
  try {
    const { data, error } = await supabaseAdmin.from('user_shops').select('role').eq('user_id', userId).eq('shop_id', shopId).limit(1).maybeSingle()
    if (error) return null
    return (data as any)?.role ?? null
  } catch (e) { return null }
}

export async function getShopAuthorizedDevice(supabaseAdmin: SupabaseClient, shopId: string): Promise<string | null> {
  try {
    const { data, error } = await supabaseAdmin.from('shops').select('id,authoritative_device_id,offline_primary_device_id,pos_device_id').eq('id', shopId).limit(1).maybeSingle()
    if (error) return null
    const row: any = data as any
    return row?.authoritative_device_id ?? row?.offline_primary_device_id ?? row?.pos_device_id ?? null
  } catch (e) { return null }
}

export async function auditDeviceEvent(supabaseAdmin: SupabaseClient, payload: Record<string, unknown>) {
  try {
    // best-effort insert into device_audit_logs (may not exist)
    await supabaseAdmin.from('device_audit_logs').insert([payload])
  } catch (e) {
    // ignore failures (migration may be missing)
    console.warn('device audit insert failed', e)
  }
}

export async function enforceDeviceWritePermission(supabaseAdmin: SupabaseClient, shopId: string, userId: string | null, deviceId: string | null): Promise<AuthCheckResult> {
  // fetch role
  const role = userId ? await getUserRoleForShop(supabaseAdmin, userId, shopId) : null
  const isAdmin = role === 'admin' || role === 'owner'

  // admins may bypass
  if (isAdmin) {
    if (deviceId) {
      await auditDeviceEvent(supabaseAdmin, { who: userId, when: new Date().toISOString(), shop_id: shopId, action: 'admin_bypass', device_id: deviceId })
    } else {
      await auditDeviceEvent(supabaseAdmin, { who: userId, when: new Date().toISOString(), shop_id: shopId, action: 'admin_bypass', device_id: null })
    }
    return { allowed: true, isAdmin: true, bypassed: true }
  }

  // staff: require authorized device
  const authDevice = await getShopAuthorizedDevice(supabaseAdmin, shopId)
  if (!authDevice) {
    // no authoritative device set — not allowed to write until auto-claim runs on sign-in; treat as blocked
    return { allowed: false, reason: 'no_authorized_device' }
  }
  if (!deviceId) return { allowed: false, reason: 'missing_device_id' }
  if (String(deviceId) !== String(authDevice)) return { allowed: false, reason: 'device_mismatch' }
  return { allowed: true }
}

export default { getUserRoleForShop, getShopAuthorizedDevice, enforceDeviceWritePermission, auditDeviceEvent }
