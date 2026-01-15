// Offline sync disabled. Provide a safe no-op export for startAutoSync.

import { getAllOutboxItems, deleteOutboxItem, updateOutboxAttempts, updateOutboxStatus } from './offlineQueue'
import fetchWithAuth from './fetchWithAuth'

let intervalHandle: number | null = null
let onlineListener: (() => void) | null = null

export function startAutoSync(opts?: { intervalMs?: number }) {
  const intervalMs = opts?.intervalMs ?? 30_000
  // avoid duplicate registration
  stopAutoSync()
  async function tryFlush() {
    try { await flushOnce() } catch (e) { /* swallow */ }
  }
  // run periodically
  intervalHandle = window.setInterval(tryFlush, intervalMs)
  // also run when coming back online
  onlineListener = () => { tryFlush().catch(() => {}) }
  window.addEventListener('online', onlineListener)

  // initial attempt
  tryFlush().catch(() => {})

  return () => stopAutoSync()
}

export function stopAutoSync() {
  try {
    if (intervalHandle) { window.clearInterval(intervalHandle); intervalHandle = null }
    if (onlineListener) { window.removeEventListener('online', onlineListener); onlineListener = null }
  } catch (_) {}
}

export async function flushOnce() {
  const items = await getAllOutboxItems()
  if (!items || items.length === 0) return

  for (const it of items) {
    try {
      // basic retry handling
      const attempts = (it.retryCount || 0) + 1

      // map known action types to endpoints
      let endpoint = ''
      const method: 'POST' | 'PUT' | 'DELETE' = 'POST'
      let body: any = it.payload

      switch (it.actionType) {
        case 'create_product':
          endpoint = '/api/products'
          body = (it.payload && it.payload.product) ? it.payload.product : it.payload
          break
        case 'assign_barcode':
          endpoint = '/api/barcodes/assign'
          // try to include shop_id/device_id on server side via auth + device header
          body = { ...(it.payload || {}) }
          break
        case 'checkout':
        case 'create_sale':
          endpoint = '/api/checkout'
          body = it.payload
          break
        default:
          // unknown action: mark failed
          await updateOutboxStatus(it.queueId, 'failed', 'unknown_action')
          continue
      }

      // issue request with auth helper to attach Authorization header
      try {
        const res = await fetchWithAuth(endpoint, { method, headers: { 'content-type': 'application/json', 'x-device-id': it.deviceId ?? '' }, body: JSON.stringify(body) })
        if (res.ok) {
          await deleteOutboxItem(it.queueId)
          continue
        }

        if (res.status === 403) {
          // unauthorized to sync — mark failed with reason
          const json = await res.json().catch(() => ({}))
          await updateOutboxStatus(it.queueId, 'failed', (json && (json.error || json.message)) ? String(json.error || json.message) : 'forbidden')
          continue
        }

        // server returned other error; increase retry count and leave for retry
        const txt = await res.text().catch(() => '')
        await updateOutboxAttempts(it.queueId, attempts)
        await updateOutboxStatus(it.queueId, 'pending', txt || null)
      } catch (e: any) {
        // network error; increment attempts
        await updateOutboxAttempts(it.queueId, attempts)
      }
    } catch (e) {
      // ensure single item failures don't abort flush
      try { await updateOutboxStatus(it.queueId, 'failed', String(e instanceof Error ? e.message : e)) } catch (_) {}
    }
  }
}

export default { startAutoSync, stopAutoSync, flushOnce }
