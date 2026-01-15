import deviceIdService from './deviceId'

export function getStoredDeviceId() {
  try { return localStorage.getItem('pos:device-id') } catch (e) { return null }
}

// Ensure the device id is persisted using the robust deviceId service (IndexedDB primary).
export async function ensureDeviceIdPersisted(): Promise<string | null> {
  try {
    const id = await deviceIdService.getOrCreateDeviceId()
    try { localStorage.setItem('pos:device-id', id) } catch (_) {}
    return id
  } catch (e) {
    return getStoredDeviceId()
  }
}

export async function registerDeviceWithServer(accessToken: string, deviceId?: string) {
  try {
    if (!deviceId) deviceId = (await ensureDeviceIdPersisted()) || getStoredDeviceId() || undefined
    // try to capture device brand from User-Agent Client Hints or fallbacks
    let deviceBrand: string | null = null
    try {
      const uaData = (navigator as unknown as { userAgentData?: { brands?: Array<{ brand?: string }> } }).userAgentData
      if (uaData && Array.isArray(uaData.brands)) {
        deviceBrand = uaData.brands.map(b => b.brand || '').join(', ')
      }
    } catch (_) {}
    if (!deviceBrand) deviceBrand = (navigator as unknown as { platform?: string; userAgent?: string }).platform || (navigator as unknown as { userAgent?: string }).userAgent || 'unknown'

    const res = await fetch('/api/devices/register', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ device_id: deviceId, device_brand: deviceBrand })
    })

    if (res.ok) {
      try { if (deviceId) localStorage.setItem('pos:device-id', deviceId) } catch (e) {}
      return { ok: true }
    }

    const json = await res.json().catch(() => ({} as Record<string, unknown>))
    return { ok: false, error: (json as unknown as { error?: string })?.error }
  } catch (err: unknown) {
    const msg = typeof err === 'object' && err !== null && 'message' in err ? String((err as unknown as { message?: string }).message) : String(err)
    return { ok: false, error: msg }
  }
}

export function getOrCreateDeviceId() {
  try {
    let id = localStorage.getItem('pos:device-id')
    if (!id) {
      if (typeof crypto !== 'undefined' && (crypto as unknown as { randomUUID?: () => string }).randomUUID) id = (crypto as unknown as { randomUUID?: () => string }).randomUUID!()
      else {
        const s4 = () => Math.floor((1 + Math.random()) * 0x10000).toString(16).substring(1)
        id = `${s4()}${s4()}-${s4()}-${s4()}-${s4()}-${s4()}${s4()}${s4()}`
      }
      try { localStorage.setItem('pos:device-id', id) } catch (_) {}
    }
    return id
  } catch (e) {
    return null
  }
}
