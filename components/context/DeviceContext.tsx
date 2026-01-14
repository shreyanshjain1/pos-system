"use client"
import React, { createContext, useContext, useEffect, useState } from 'react'
import supabase from '@/lib/supabase/client'
import { getOrCreateDeviceId, registerDeviceWithServer, getStoredDeviceId } from '@/lib/devices'
import fetchWithAuth from '@/lib/fetchWithAuth'
import { isMainPOSDevice } from '@/lib/permissions'

type DeviceContextValue = {
  deviceId: string | null
  deviceRow: any | null
  shop: any | null
  isMain: boolean
  isRevoked: boolean
  loading: boolean
}

const DeviceContext = createContext<DeviceContextValue | undefined>(undefined)

export function DeviceProvider({ children }: { children: React.ReactNode }) {
  const [deviceId, setDeviceId] = useState<string | null>(null)
  const [deviceRow, setDeviceRow] = useState<any | null>(null)
  const [shop, setShop] = useState<any | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true
    async function init() {
      setLoading(true)
      try {
        const rawId = getOrCreateDeviceId()
        const id = rawId ?? undefined
        if (!mounted) return
        setDeviceId(rawId ?? null)

        // get session token
        let accessToken: string | null = null
        try {
          const { data } = await (supabase as any).auth.getSession()
          accessToken = (data as any)?.session?.access_token ?? null
        } catch (e) {}

        // register device if we have a token
        if (accessToken) {
          try {
            const res = await fetchWithAuth('/api/devices/register', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ device_id: id }) })
            const json = await res.json().catch(() => ({}))
            if (res.ok && json?.data) {
              // register route returns inserted/updated rows
              setDeviceRow(Array.isArray(json.data) ? json.data[0] : json.data)
            } else {
              // fallback: try the helper that uses direct fetch and persists id
              try {
                const alt = await registerDeviceWithServer(accessToken, id ?? undefined)
                if (alt && (alt as any).ok) {
                  // attempt to fetch device row by querying register response again
                  const retry = await fetchWithAuth('/api/devices/register', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ device_id: id }) })
                  const rjson = await retry.json().catch(() => ({}))
                  if (retry.ok && rjson?.data) setDeviceRow(Array.isArray(rjson.data) ? rjson.data[0] : rjson.data)
                }
              } catch (e) {
                // ignore
              }
            }
          } catch (e) {
            // last-resort: call registerDeviceWithServer helper
            try {
              const alt = await registerDeviceWithServer(accessToken, id ?? undefined)
              if (alt && (alt as any).ok) {
                // try fetching again
                const retry = await fetchWithAuth('/api/devices/register', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ device_id: id }) })
                const rjson = await retry.json().catch(() => ({}))
                if (retry.ok && rjson?.data) setDeviceRow(Array.isArray(rjson.data) ? rjson.data[0] : rjson.data)
              }
            } catch (_) {}
          }
        }

        // fetch shop for this user
        try {
          const res = await fetchWithAuth('/api/shops/me')
          if (res.ok) {
            const json = await res.json()
            if (json?.data) setShop(json.data)
          }
        } catch (_) {}
      } finally {
        if (mounted) setLoading(false)
      }
    }
    init()
    return () => { mounted = false }
  }, [])

  const isMain = isMainPOSDevice({ shop, deviceRow, device_id: deviceId })
  const isRevoked = !!(deviceRow && deviceRow.is_revoked)

  return (
    <DeviceContext.Provider value={{ deviceId, deviceRow, shop, isMain, isRevoked, loading }}>
      {children}
    </DeviceContext.Provider>
  )
}

export function useDevice() {
  const ctx = useContext(DeviceContext)
  if (!ctx) throw new Error('useDevice must be used within DeviceProvider')
  return ctx
}

export default DeviceContext
