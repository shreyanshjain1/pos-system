'use client'
import { useOnline } from '@/components/context/OnlineContext'
import { useOfflineQueue } from '@/hooks/useOfflineQueue'
import { useEffect, useState } from 'react'

export function useOfflineNotification() {
  const { isOnline } = useOnline()
  const { pendingCount, failedCount } = useOfflineQueue()
  const [message, setMessage] = useState<string | null>(null)

  useEffect(() => {
    if (!isOnline && pendingCount > 0) {
      setMessage(`${pendingCount} transaction${pendingCount !== 1 ? 's' : ''} queued - will sync when online`)
    } else if (isOnline && pendingCount === 0 && failedCount === 0) {
      setMessage(null)
    } else if (failedCount > 0) {
      setMessage(`${failedCount} transaction${failedCount !== 1 ? 's' : ''} failed to sync - check network`)
    }
  }, [isOnline, pendingCount, failedCount])

  return {
    message,
    isOffline: !isOnline,
    hasPending: pendingCount > 0,
    hasFailed: failedCount > 0,
  }
}
