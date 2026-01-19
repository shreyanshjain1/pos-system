"use client"
import React, { createContext, useContext, useEffect, useState } from 'react'
import supabase from '@/lib/supabase/client'
import { getOrCreateDeviceId, registerDeviceWithServer, getStoredDeviceId } from '@/lib/devices'
import fetchWithAuth from '@/lib/fetchWithAuth'
import { isMainPOSDevice } from '@/lib/permissions'

type DeviceContextValue = {
  deviceId: string | null
  deviceRow: unknown | null
  shop: unknown | null
  isMain: boolean
  isRevoked: boolean
  loading: boolean
}

const DeviceContext = createContext<DeviceContextValue | null>(null)

export function DeviceProvider({ children }: { children: React.ReactNode }) {
  const [deviceId, setDeviceId] = useState<string | null>(null)
  const [deviceRow, setDeviceRow] = useState<unknown | null>(null)
  const [shop, setShop] = useState<unknown | null>(null)
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
          // supabase client may have different runtime shapes; treat response as unknown and narrow
          const sessionResp = await (supabase as unknown as { auth?: { getSession?: () => Promise<unknown> } })?.auth?.getSession?.()
          const data = sessionResp as unknown
          accessToken = (data as unknown as { session?: { access_token?: string } })?.session?.access_token ?? null
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
                if (alt && (alt as unknown as { ok?: boolean }).ok) {
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
              if (alt && (alt as unknown as { ok?: boolean }).ok) {
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
  // PWA/service worker removed for online-only mode

  // Local shape types to match `lib/permissions` expectations
  type ShopLike = { pos_device_id?: unknown; offline_primary_device_id?: unknown } | null
  type DeviceRowLike = { is_revoked?: boolean } | null

  const isMain = isMainPOSDevice({ shop: shop as unknown as ShopLike, deviceRow: deviceRow as unknown as DeviceRowLike, device_id: deviceId })
  const isRevoked = !!((deviceRow as unknown as DeviceRowLike)?.is_revoked)

  return (
    <DeviceContext.Provider value={{ deviceId, deviceRow, shop, isMain, isRevoked, loading }}>
      {children}
    </DeviceContext.Provider>
  )
}

export function useDevice() {
  const ctx = useContext(DeviceContext)
  return ctx ?? null
}

export default DeviceContext
