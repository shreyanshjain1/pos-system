// Offline sync - automatically retries pending transactions when online
import { getAllOutboxItems, updateOutboxStatus, updateOutboxAttempts, deleteOutboxItem } from './offlineQueue'
import { fetchWithAuth } from './fetchWithAuth'

const MAX_RETRIES = 3

let syncInProgress = false
let syncInterval: number | null = null

export function startAutoSync(opts?: { intervalMs?: number }) {
  const intervalMs = opts?.intervalMs || 30000 // 30s default

  // Don't start multiple sync loops
  if (syncInterval) return stopAutoSync

  syncInterval = window.setInterval(() => {
    flushOnce().catch(err => console.error('Auto sync error:', err))
  }, intervalMs)

  // Try immediate sync on startup
  flushOnce().catch(err => console.error('Initial sync error:', err))

  return stopAutoSync
}

export function stopAutoSync() {
  if (syncInterval) {
    window.clearInterval(syncInterval)
    syncInterval = null
  }
}

export async function flushOnce(): Promise<void> {
  // Prevent concurrent syncs
  if (syncInProgress) return
  syncInProgress = true

  try {
    const items = await getAllOutboxItems()
    const pending = items.filter(item => item.status === 'pending')

    if (pending.length === 0) return

    for (const item of pending) {
      try {
        // Check if max retries exceeded
        if (item.retryCount >= MAX_RETRIES) {
          await updateOutboxStatus(item.queueId, 'failed', 'Max retries exceeded')
          continue
        }

        // Attempt to sync based on action type
        const result = await syncItem(item)

        if (result.success) {
          await updateOutboxStatus(item.queueId, 'synced', null)
          await deleteOutboxItem(item.queueId)
        } else if (result.fatal) {
          await updateOutboxStatus(item.queueId, 'failed', result.message || 'Server rejected transaction')
        } else {
          // Increment retry count
          await updateOutboxAttempts(item.queueId, item.retryCount + 1)
          await updateOutboxStatus(item.queueId, 'pending', result.message || null)
        }
      } catch (err) {
        const errMsg = err instanceof Error ? err.message : String(err)
        await updateOutboxAttempts(item.queueId, item.retryCount + 1)
        await updateOutboxStatus(item.queueId, 'pending', errMsg)
      }
    }
  } finally {
    syncInProgress = false
  }
}

type SyncResult = { success: boolean; fatal?: boolean; message?: string }

async function syncItem(item: any): Promise<SyncResult> {
  try {
    // Route to appropriate endpoint based on action type
    const response = await fetchWithAuth('/api/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(item.payload),
    })

    if (response.ok) {
      return { success: true }
    }

    const json = await response.json().catch(() => ({}))
    const serverMsg = (json as Record<string, any>)['error'] as string | undefined

    // If unauthorized or forbidden, don't retry
    if (response.status === 401 || response.status === 403) {
      return { success: false, fatal: true, message: serverMsg || 'Unauthorized' }
    }

    // Treat bad request / conflict as fatal (likely stock or validation conflict)
    if (response.status === 400 || response.status === 409) {
      return { success: false, fatal: true, message: serverMsg || 'Server rejected transaction (conflict/validation)' }
    }

    return { success: false, message: serverMsg }
  } catch (err) {
    console.error(`Failed to sync ${item.actionType}:`, err)
    throw err
  }
}

export default { startAutoSync, stopAutoSync, flushOnce }
