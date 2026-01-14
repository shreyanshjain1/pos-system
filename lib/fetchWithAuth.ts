import { supabase } from './supabase/client'
import { getStoredDeviceId } from './devices'

export async function fetchWithAuth(input: RequestInfo, init?: RequestInit) {
  let accessToken: string | null = null
  try {
    const { data } = await supabase.auth.getSession()
    accessToken = (data as any)?.session?.access_token ?? null
  } catch (e) {
    console.warn('fetchWithAuth: getSession failed', e)
  }

  const headers = new Headers(init?.headers as HeadersInit | undefined)
  if (accessToken) headers.set('Authorization', `Bearer ${accessToken}`)

  try {
    const deviceId = getStoredDeviceId()
    if (deviceId) headers.set('x-device-id', deviceId)
  } catch (e) {
    // ignore
  }

  const res = await fetch(input, { ...init, headers })
  return res
}

export default fetchWithAuth
