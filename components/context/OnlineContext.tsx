"use client"
import React, { createContext, useContext, useEffect, useState } from 'react'

type OnlineContextValue = {
  isOnline: boolean
  lastPingAt: number | null
}

const OnlineContext = createContext<OnlineContextValue>({ isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true, lastPingAt: null })

export function OnlineProvider({ children }: { children: React.ReactNode }) {
  const [isOnline, setIsOnline] = useState<boolean>(typeof navigator !== 'undefined' ? navigator.onLine : true)
  const [lastPingAt, setLastPingAt] = useState<number | null>(null)

  useEffect(() => {
    let mounted = true

    function onOnline() { setIsOnline(true) }
    function onOffline() { setIsOnline(false) }

    window.addEventListener('online', onOnline)
    window.addEventListener('offline', onOffline)

    // periodic ping to server to confirm connectivity when browser reports online
    let timer: number | null = null
    const ping = async () => {
      try {
        const controller = new AbortController()
        const id = setTimeout(() => controller.abort(), 4000)
        const res = await fetch('/api/summary', { method: 'GET', signal: controller.signal })
        clearTimeout(id)
        if (!mounted) return
        if (res.ok) {
          setIsOnline(true)
          setLastPingAt(Date.now())
        } else {
          setIsOnline(false)
        }
      } catch (e) {
        if (!mounted) return
        setIsOnline(false)
      }
    }

    // run ping every 15s when navigator reports online
    const startPing = () => {
      if (timer) window.clearInterval(timer)
      ping()
      timer = window.setInterval(() => { if (navigator.onLine) ping() }, 15000)
    }

    startPing()

    return () => {
      mounted = false
      window.removeEventListener('online', onOnline)
      window.removeEventListener('offline', onOffline)
      if (timer) window.clearInterval(timer)
    }
  }, [])

  return (
    <OnlineContext.Provider value={{ isOnline, lastPingAt }}>
      {children}
    </OnlineContext.Provider>
  )
}

export function useOnline() {
  return useContext(OnlineContext)
}
