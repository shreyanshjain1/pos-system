export function isMainPOSDevice({ shop, deviceRow, device_id }: { shop: any | null; deviceRow: any | null; device_id?: string | null }) {
  if (!shop) return false
  const posId = shop.pos_device_id ?? shop.offline_primary_device_id ?? null
  if (!posId) return false
  if (!device_id) return false
  if (deviceRow && deviceRow.is_revoked) return false
  return String(posId) === String(device_id)
}

export function isViewOnly({ shop, deviceRow, device_id }: { shop: any | null; deviceRow: any | null; device_id?: string | null }) {
  return !isMainPOSDevice({ shop, deviceRow, device_id })
}

export default { isMainPOSDevice, isViewOnly }
