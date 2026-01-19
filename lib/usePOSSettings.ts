/**
 * Hook to sync POS settings between localStorage and server
 * Provides server-side persistence while maintaining local cache
 */

'use client'

import { useEffect, useState, useCallback } from 'react'
import fetchWithAuth from './fetchWithAuth'

export interface POSSettings {
  layout?: 'side' | 'stacked'
  storeName?: string
  receiptHeader?: string
  receiptFooter?: string
  currency?: string
  scannerDeviceId?: string
  scannerMode?: 'keyboard' | 'camera'
  [key: string]: unknown
}

const STORAGE_KEY = 'pos:settings'
const DEFAULTS: POSSettings = {
  layout: 'side',
  storeName: 'Store',
  receiptHeader: '',
  receiptFooter: '',
  currency: 'PHP',
  scannerDeviceId: '',
  scannerMode: 'keyboard',
}

/**
 * Hook to manage POS settings with server sync
 * Syncs to localStorage immediately for speed, then syncs to server
 */
export function usePOSSettings() {
  const [settings, setSettingsState] = useState<POSSettings>(DEFAULTS)
  const [synced, setSynced] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Load from localStorage and server on mount
  useEffect(() => {
    let mounted = true

    ;(async () => {
      try {
        // 1. Load from localStorage immediately (for fast UI)
        try {
          const raw = localStorage.getItem(STORAGE_KEY)
          if (raw && mounted) {
            const parsed = JSON.parse(raw)
            setSettingsState((prev) => ({ ...DEFAULTS, ...prev, ...parsed }))
          }
        } catch (_) {
          // localStorage error, continue
        }

        // 2. Fetch from server (authoritative source)
        try {
          const res = await fetchWithAuth('/api/settings')
          if (!mounted) return
          if (res.ok) {
            const json = await res.json()
            const serverSettings = (json as unknown as { data?: POSSettings })?.data || {}
            setSettingsState((prev) => ({ ...DEFAULTS, ...prev, ...serverSettings }))
            setSynced(true)
          } else {
            // Server fetch failed, use localStorage
            setSynced(false)
          }
        } catch (e) {
          // Server error, fall back to localStorage
          setSynced(false)
        }
      } finally {
        if (mounted) setLoading(false)
      }
    })()

    return () => {
      mounted = false
    }
  }, [])

  // Save settings to localStorage and server
  const saveSettings = useCallback(
    async (updates: Partial<POSSettings>) => {
      setError(null)
      const newSettings = { ...settings, ...updates }

      // 1. Save to localStorage immediately (optimistic)
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(newSettings))
        setSettingsState(newSettings)
      } catch (e) {
        setError('Failed to save settings locally')
        return
      }

      // 2. Sync to server asynchronously
      try {
        const res = await fetchWithAuth('/api/settings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(newSettings),
        })
        if (!res.ok) {
          const json = await res.json()
          const errMsg = (json as unknown as { error?: string })?.error || 'Failed to sync settings'
          setError(errMsg)
          setSynced(false)
        } else {
          setSynced(true)
        }
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'Failed to sync settings'
        setError(msg)
        setSynced(false)
      }
    },
    [settings]
  )

  return {
    settings,
    saveSettings,
    loading,
    synced,
    error,
  }
}

/**
 * Get a single setting value
 */
export function getSettingValue(key: keyof POSSettings, defaultValue?: unknown): unknown {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return defaultValue ?? DEFAULTS[key]
    const parsed = JSON.parse(raw)
    return parsed[key] ?? DEFAULTS[key] ?? defaultValue
  } catch (_) {
    return defaultValue ?? DEFAULTS[key]
  }
}

/**
 * Set a single setting value (synchronously to localStorage)
 */
export function setSettingValue(key: keyof POSSettings, value: unknown): void {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    const parsed = raw ? JSON.parse(raw) : {}
    parsed[key] = value
    localStorage.setItem(STORAGE_KEY, JSON.stringify(parsed))
  } catch (_) {
    // Silent fail
  }
}
