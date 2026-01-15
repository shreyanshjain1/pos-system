type ShopLike = { pos_device_id?: unknown; offline_primary_device_id?: unknown; authoritative_device_id?: unknown } | null
type DeviceRowLike = { is_revoked?: boolean } | null

export function isMainPOSDevice({ shop, deviceRow, device_id }: { shop: ShopLike; deviceRow: DeviceRowLike; device_id?: string | null }) {
  if (!shop) return false
  // Prefer explicit authoritative_device_id when present, fall back to older fields for compatibility
  const posId = (shop as ShopLike)?.authoritative_device_id ?? (shop as ShopLike)?.pos_device_id ?? (shop as ShopLike)?.offline_primary_device_id ?? null
  if (!posId) return false
  if (!device_id) return false
  if (deviceRow && deviceRow.is_revoked) return false
  return String(posId) === String(device_id)
}

export function isViewOnly({ shop, deviceRow, device_id }: { shop: ShopLike; deviceRow: DeviceRowLike; device_id?: string | null }) {
  return !isMainPOSDevice({ shop, deviceRow, device_id })
}

export default { isMainPOSDevice, isViewOnly }
