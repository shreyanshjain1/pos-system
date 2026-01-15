// Minimal IndexedDB-backed offline outbox and barcode/product cache.
// Provides basic queueing for client-side writes when offline.

type OutboxItem = {
  queueId: string
  deviceId?: string
  shopId?: string
  userId?: string
  role?: string
  timestamp: string
  actionType: string
  payload: any
  retryCount: number
  status: 'pending' | 'synced' | 'failed'
  lastError?: string | null
}

const DB_NAME = 'pos_offline_v1'
const OUTBOX_STORE = 'pos_outbox'
const PRODUCTS_STORE = 'pos_cache_products'
const BARCODES_STORE = 'pos_cache_barcodes'

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1)
    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains(OUTBOX_STORE)) db.createObjectStore(OUTBOX_STORE, { keyPath: 'queueId' })
      if (!db.objectStoreNames.contains(PRODUCTS_STORE)) db.createObjectStore(PRODUCTS_STORE, { keyPath: 'id' })
      if (!db.objectStoreNames.contains(BARCODES_STORE)) db.createObjectStore(BARCODES_STORE, { keyPath: 'code' })
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

function genId() {
  try { return (globalThis.crypto as any).randomUUID() } catch (_) { return Math.random().toString(36).slice(2) }
}

export async function addOutboxItem(actionType: string, payload: any, opts?: { deviceId?: string; shopId?: string; userId?: string; role?: string }) {
  const db = await openDB()
  return new Promise<string>((resolve, reject) => {
    const tx = db.transaction(OUTBOX_STORE, 'readwrite')
    const store = tx.objectStore(OUTBOX_STORE)
    const item: OutboxItem = {
      queueId: genId(),
      deviceId: opts?.deviceId,
      shopId: opts?.shopId,
      userId: opts?.userId,
      role: opts?.role,
      timestamp: new Date().toISOString(),
      actionType,
      payload,
      retryCount: 0,
      status: 'pending',
      lastError: null,
    }
    const req = store.add(item as any)
    req.onsuccess = () => resolve(item.queueId)
    req.onerror = () => reject(req.error)
  })
}

export async function getAllOutboxItems(): Promise<OutboxItem[]> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(OUTBOX_STORE, 'readonly')
    const store = tx.objectStore(OUTBOX_STORE)
    const req = store.getAll()
    req.onsuccess = () => resolve(req.result as OutboxItem[])
    req.onerror = () => reject(req.error)
  })
}

export async function deleteOutboxItem(id: string) {
  const db = await openDB()
  return new Promise<void>((resolve, reject) => {
    const tx = db.transaction(OUTBOX_STORE, 'readwrite')
    const store = tx.objectStore(OUTBOX_STORE)
    const req = store.delete(id)
    req.onsuccess = () => resolve()
    req.onerror = () => reject(req.error)
  })
}

export async function updateOutboxAttempts(id: string, attempts: number) {
  const db = await openDB()
  return new Promise<void>((resolve, reject) => {
    const tx = db.transaction(OUTBOX_STORE, 'readwrite')
    const store = tx.objectStore(OUTBOX_STORE)
    const getReq = store.get(id)
    getReq.onsuccess = () => {
      const rec = getReq.result
      if (!rec) return resolve()
      rec.retryCount = attempts
      const putReq = store.put(rec)
      putReq.onsuccess = () => resolve()
      putReq.onerror = () => reject(putReq.error)
    }
    getReq.onerror = () => reject(getReq.error)
  })
}

export async function updateOutboxStatus(id: string, status: 'pending' | 'synced' | 'failed', lastError?: string | null) {
  const db = await openDB()
  return new Promise<void>((resolve, reject) => {
    const tx = db.transaction(OUTBOX_STORE, 'readwrite')
    const store = tx.objectStore(OUTBOX_STORE)
    const getReq = store.get(id)
    getReq.onsuccess = () => {
      const rec = getReq.result
      if (!rec) return resolve()
      rec.status = status
      rec.lastError = lastError ?? null
      const putReq = store.put(rec)
      putReq.onsuccess = () => resolve()
      putReq.onerror = () => reject(putReq.error)
    }
    getReq.onerror = () => reject(getReq.error)
  })
}

export async function cacheProduct(product: any) {
  const db = await openDB()
  return new Promise<void>((resolve, reject) => {
    const tx = db.transaction(PRODUCTS_STORE, 'readwrite')
    const store = tx.objectStore(PRODUCTS_STORE)
    // Ensure product has an `id` matching the store's keyPath
    try {
      if (!product || typeof product !== 'object') throw new Error('invalid product')
      if (product.id === undefined || product.id === null || product.id === '') {
        // assign temporary id so put/add won't fail when keyPath is required
        try { product.id = (globalThis.crypto as any)?.randomUUID?.() ?? Math.random().toString(36).slice(2) } catch (_) { product.id = Math.random().toString(36).slice(2) }
      }
    } catch (e) {
      return reject(e)
    }

    const req = store.put(product)
    req.onsuccess = () => resolve()
    req.onerror = () => reject(req.error)
  })
}

export async function cacheBarcode(code: string, product: any) {
  const db = await openDB()
  return new Promise<void>((resolve, reject) => {
    const tx = db.transaction(BARCODES_STORE, 'readwrite')
    const store = tx.objectStore(BARCODES_STORE)
    const req = store.put({ code, product })
    req.onsuccess = () => resolve()
    req.onerror = () => reject(req.error)
  })
}

export async function lookupBarcodeCached(code: string): Promise<any | null> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(BARCODES_STORE, 'readonly')
    const store = tx.objectStore(BARCODES_STORE)
    const req = store.get(code)
    req.onsuccess = () => resolve(req.result ? req.result.product : null)
    req.onerror = () => reject(req.error)
  })
}

export default { addOutboxItem, getAllOutboxItems, deleteOutboxItem, updateOutboxAttempts, cacheProduct, cacheBarcode, lookupBarcodeCached }

// Broadcast update helper: notifies other tabs/clients that products/sales changed
export function broadcastDataUpdate() {
  try {
    // use BroadcastChannel when available
    if (typeof BroadcastChannel !== 'undefined') {
      const bc = new BroadcastChannel('pos-updates')
      bc.postMessage({ type: 'data-updated', at: Date.now() })
      bc.close()
      return
    }
  } catch (_) {}

  // fallback: use localStorage event
  try {
    localStorage.setItem('pos:data-updated', String(Date.now()))
  } catch (_) {}
}
