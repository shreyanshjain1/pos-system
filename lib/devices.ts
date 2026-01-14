export function getStoredDeviceId() {
  try {
    return localStorage.getItem('pos:device-id')
  } catch (e) {
    return null
  }
}

export function generateDeviceId() {
  try {
    if (typeof crypto !== 'undefined' && (crypto as any).randomUUID) {
      return (crypto as any).randomUUID()
    }
  } catch (e) {}

  // fallback UUID v4
  const s4 = () => Math.floor((1 + Math.random()) * 0x10000).toString(16).substring(1)
  return `${s4()}${s4()}-${s4()}-${s4()}-${s4()}-${s4()}${s4()}${s4()}`
}

export async function registerDeviceWithServer(accessToken: string, deviceId?: string) {
  try {
    if (!deviceId) deviceId = getStoredDeviceId() || generateDeviceId()
    // try to capture device brand from User-Agent Client Hints or fallbacks
    let deviceBrand: string | null = null
    try {
      const uaData: any = (navigator as any).userAgentData
      if (uaData && Array.isArray(uaData.brands)) {
        deviceBrand = uaData.brands.map((b: any) => b.brand).join(', ')
      }
    } catch (e) {}
    if (!deviceBrand) deviceBrand = navigator.platform || navigator.userAgent || 'unknown'

    const res = await fetch('/api/devices/register', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ device_id: deviceId, device_brand: deviceBrand })
    })

    if (res.ok) {
      try { localStorage.setItem('pos:device-id', deviceId) } catch (e) {}
      return { ok: true }
    }

    const json = await res.json().catch(() => ({}))
    return { ok: false, error: json?.error }
  } catch (err: any) {
    return { ok: false, error: err?.message || String(err) }
  }
}

export function getOrCreateDeviceId() {
  try {
    let id = localStorage.getItem('pos:device-id')
    if (!id) {
      if (typeof crypto !== 'undefined' && (crypto as any).randomUUID) id = (crypto as any).randomUUID()
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
