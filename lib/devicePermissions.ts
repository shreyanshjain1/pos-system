export function canCheckout({ device, shop, isOnline }: { device: any | null; shop: any | null; isOnline: boolean }): boolean {
  if (!device) return false
  if (device.is_revoked) return false
  if (!device.can_checkout) return false
  if (isOnline) return true
  if (!shop) return false
  return String(device.device_id) === String(shop.offline_primary_device_id)
}

export function requiresOnlineForProductEdit({ device, isOnline }: { device: any | null; isOnline: boolean }) {
  if (!device) return false
  return device.can_checkout === true && isOnline === true
}
