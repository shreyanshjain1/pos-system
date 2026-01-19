'use client'
import React, { useEffect, useState } from 'react'
import { useOnline } from '@/components/context/OnlineContext'
import { useOfflineQueue } from '@/hooks/useOfflineQueue'

export function OfflineIndicator() {
  const { isOnline } = useOnline()
  const { pendingCount, failedCount } = useOfflineQueue()
  const [mounted, setMounted] = useState(false)
  const [dismissed, setDismissed] = useState(false)

  // Only render after hydration to prevent SSR mismatch
  useEffect(() => {
    setMounted(true)
  }, [])

  // Reset dismissed state when coming back online
  useEffect(() => {
    if (isOnline) {
      setDismissed(false)
    }
  }, [isOnline])

  if (!mounted) {
    return null
  }

  if (isOnline && pendingCount === 0 && failedCount === 0) {
    return null
  }

  return (
    <div className="fixed bottom-6 right-6 flex flex-col gap-2 max-w-sm z-50">
      {!isOnline && !dismissed && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 shadow-lg relative">
          <button
            onClick={() => setDismissed(true)}
            className="absolute top-2 right-2 text-amber-600 hover:text-amber-800 transition-colors"
            aria-label="Close notification"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M6 18L18 6M6 6l12 12" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
          <div className="flex items-start gap-2 pr-6">
            <div className="text-amber-600 text-lg">🔴</div>
            <div>
              <div className="font-semibold text-amber-900">No Connection</div>
              <p className="text-sm text-amber-800">
                Your POS is offline. Transactions will be queued and synced when back online.
              </p>
            </div>
          </div>
        </div>
      )}

      {pendingCount > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 shadow-lg">
          <div className="flex items-start gap-2">
            <div className="text-blue-600 text-lg">⏳</div>
            <div>
              <div className="font-semibold text-blue-900">
                {pendingCount} Transaction{pendingCount !== 1 ? 's' : ''} Queued
              </div>
              <p className="text-sm text-blue-800">
                {isOnline ? 'Syncing...' : 'Waiting to reconnect'}
              </p>
            </div>
          </div>
        </div>
      )}

      {failedCount > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 shadow-lg">
          <div className="flex items-start gap-2">
            <div className="text-red-600 text-lg">❌</div>
            <div>
              <div className="font-semibold text-red-900">
                {failedCount} Failed Sync
              </div>
              <p className="text-sm text-red-800">
                Check network and try again. Review in Sales history.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
