'use client'
import { useEffect, useState, useCallback } from 'react'
import { addOutboxItem, getAllOutboxItems, type OutboxItem } from '@/lib/offlineQueue'
import { flushOnce } from '@/lib/offlineSync'
import { useOnline } from '@/components/context/OnlineContext'

export function useOfflineQueue() {
  const { isOnline } = useOnline()
  const [queuedItems, setQueuedItems] = useState<OutboxItem[]>([])
  const [syncingCount, setSyncingCount] = useState(0)

  // Load queue on mount and listen for updates
  useEffect(() => {
    const loadQueue = async () => {
      const items = await getAllOutboxItems()
      setQueuedItems(items)
    }

    loadQueue()

    const handleDataUpdated = () => {
      loadQueue()
    }

    // Listen to BroadcastChannel updates
    try {
      const bc = new BroadcastChannel('pos-updates')
      bc.addEventListener('message', (e: MessageEvent) => {
        if (e.data.type === 'data-updated') {
          handleDataUpdated()
        }
      })
      return () => bc.close()
    } catch (_) {
      // BroadcastChannel not available, fallback to localStorage
      const handleStorageChange = () => {
        handleDataUpdated()
      }
      window.addEventListener('storage', handleStorageChange)
      return () => window.removeEventListener('storage', handleStorageChange)
    }
  }, [])

  // Auto-sync when coming online
  useEffect(() => {
    if (isOnline && queuedItems.some(item => item.status === 'pending')) {
      setSyncingCount(queuedItems.filter(item => item.status === 'pending').length)
      flushOnce()
        .then(async () => {
          const items = await getAllOutboxItems()
          setQueuedItems(items)
          setSyncingCount(0)
        })
        .catch(err => console.error('Sync error:', err))
    }
  }, [isOnline, queuedItems])

  const queueCheckout = useCallback(
    async (payload: any) => {
      const queueId = await addOutboxItem('checkout', payload)
      const items = await getAllOutboxItems()
      setQueuedItems(items)
      return queueId
    },
    []
  )

  const pendingCount = queuedItems.filter(item => item.status === 'pending').length
  const failedCount = queuedItems.filter(item => item.status === 'failed').length

  return {
    isOnline,
    queuedItems,
    pendingCount,
    failedCount,
    syncingCount,
    queueCheckout,
  }
}
