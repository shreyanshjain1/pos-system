import { supabase } from './supabase/client'
import { getStoredDeviceId, getOrCreateDeviceId } from './devices'

export async function fetchWithAuth(input: RequestInfo, init?: RequestInit) {
  let accessToken: string | null = null
  try {
    const res = await supabase.auth.getSession()
    accessToken = res.data?.session?.access_token ?? null
  } catch (e) {
    console.warn('fetchWithAuth: getSession failed', e)
  }

  const headers = new Headers(init?.headers as HeadersInit | undefined)
  if (accessToken) headers.set('Authorization', `Bearer ${accessToken}`)

  // Previously this helper attached a device id header (`x-device-id`) to every request.
  // That device-level enforcement has been removed; do not attach device header here.

  const res = await fetch(input, { ...init, headers })
  return res
}

export default fetchWithAuth
