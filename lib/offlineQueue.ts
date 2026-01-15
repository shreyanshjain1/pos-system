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
const SALES_STORE = 'pos_pending_sales'
const LS_FALLBACK_KEY = 'pos_offbox_fallback_v1'

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 2)
    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains(OUTBOX_STORE)) db.createObjectStore(OUTBOX_STORE, { keyPath: 'queueId' })
      if (!db.objectStoreNames.contains(PRODUCTS_STORE)) db.createObjectStore(PRODUCTS_STORE, { keyPath: 'id' })
      if (!db.objectStoreNames.contains(BARCODES_STORE)) db.createObjectStore(BARCODES_STORE, { keyPath: 'code' })
      if (!db.objectStoreNames.contains(SALES_STORE)) db.createObjectStore(SALES_STORE, { keyPath: 'id' })
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

function genId() {
  try { return (globalThis.crypto as any).randomUUID() } catch (_) { return Math.random().toString(36).slice(2) }
}

export async function addOutboxItem(actionType: string, payload: any, opts?: { deviceId?: string; shopId?: string; userId?: string; role?: string }) {
  // Try IndexedDB first, but fall back to localStorage if unavailable (e.g. strict contexts)
  try {
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
  } catch (e) {
    // fallback to localStorage
    try {
      const raw = localStorage.getItem(LS_FALLBACK_KEY)
      const arr: OutboxItem[] = raw ? JSON.parse(raw) : []
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
      arr.push(item)
      localStorage.setItem(LS_FALLBACK_KEY, JSON.stringify(arr))
      return item.queueId
    } catch (le) {
      throw le
    }
  }
}

export async function getAllOutboxItems(): Promise<OutboxItem[]> {
  try {
    const db = await openDB()
    return new Promise((resolve, reject) => {
      const tx = db.transaction(OUTBOX_STORE, 'readonly')
      const store = tx.objectStore(OUTBOX_STORE)
      const req = store.getAll()
      req.onsuccess = () => resolve(req.result as OutboxItem[])
      req.onerror = () => reject(req.error)
    })
  } catch (e) {
    // localStorage fallback
    try {
      const raw = localStorage.getItem(LS_FALLBACK_KEY)
      const arr: OutboxItem[] = raw ? JSON.parse(raw) : []
      return arr
    } catch (le) {
      return []
    }
  }
}

export async function deleteOutboxItem(id: string) {
  try {
    const db = await openDB()
    return new Promise<void>((resolve, reject) => {
      const tx = db.transaction(OUTBOX_STORE, 'readwrite')
      const store = tx.objectStore(OUTBOX_STORE)
      const req = store.delete(id)
      req.onsuccess = () => resolve()
      req.onerror = () => reject(req.error)
    })
  } catch (e) {
    try {
      const raw = localStorage.getItem(LS_FALLBACK_KEY)
      const arr: OutboxItem[] = raw ? JSON.parse(raw) : []
      const filtered = arr.filter(a => a.queueId !== id)
      localStorage.setItem(LS_FALLBACK_KEY, JSON.stringify(filtered))
      return
    } catch (le) {
      throw le
    }
  }
}

export async function updateOutboxAttempts(id: string, attempts: number) {
  try {
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
  } catch (e) {
    try {
      const raw = localStorage.getItem(LS_FALLBACK_KEY)
      const arr: OutboxItem[] = raw ? JSON.parse(raw) : []
      const idx = arr.findIndex(x => x.queueId === id)
      if (idx >= 0) {
        arr[idx].retryCount = attempts
        localStorage.setItem(LS_FALLBACK_KEY, JSON.stringify(arr))
      }
      return
    } catch (le) { throw le }
  }
}

export async function updateOutboxStatus(id: string, status: 'pending' | 'synced' | 'failed', lastError?: string | null) {
  try {
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
  } catch (e) {
    try {
      const raw = localStorage.getItem(LS_FALLBACK_KEY)
      const arr: OutboxItem[] = raw ? JSON.parse(raw) : []
      const idx = arr.findIndex(x => x.queueId === id)
      if (idx >= 0) {
        arr[idx].status = status
        arr[idx].lastError = lastError ?? null
        localStorage.setItem(LS_FALLBACK_KEY, JSON.stringify(arr))
      }
      return
    } catch (le) { throw le }
  }
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

// Pending sales helpers: store receipts/sales locally so POS can show queued receipts
type PendingSale = {
  id: string
  deviceId?: string
  shopId?: string
  timestamp: string
  items: any[]
  total: number
  payment_method?: string
  payment?: number
  change?: number
  status?: 'pending' | 'synced' | 'failed'
}

export async function addPendingSale(payload: { deviceId?: string; shopId?: string; items: any[]; total: number; payment_method?: string; payment?: number; change?: number }) {
  const sale: PendingSale = {
    id: genId(),
    deviceId: payload.deviceId,
    shopId: payload.shopId,
    timestamp: new Date().toISOString(),
    items: payload.items,
    total: payload.total,
    payment_method: payload.payment_method,
    payment: payload.payment,
    change: payload.change,
    status: 'pending',
  }

  try {
    const db = await openDB()
    return new Promise<string>((resolve, reject) => {
      const tx = db.transaction(SALES_STORE, 'readwrite')
      const store = tx.objectStore(SALES_STORE)
      const req = store.add(sale as any)
      req.onsuccess = () => resolve(sale.id)
      req.onerror = () => reject(req.error)
    })
  } catch (e) {
    // fallback to localStorage under a separate key
    try {
      const key = 'pos_pending_sales_fallback_v1'
      const raw = localStorage.getItem(key)
      const arr: PendingSale[] = raw ? JSON.parse(raw) : []
      arr.push(sale)
      localStorage.setItem(key, JSON.stringify(arr))
      return sale.id
    } catch (le) { throw le }
  }
}

export async function getPendingSales(): Promise<PendingSale[]> {
  try {
    const db = await openDB()
    return new Promise((resolve, reject) => {
      const tx = db.transaction(SALES_STORE, 'readonly')
      const store = tx.objectStore(SALES_STORE)
      const req = store.getAll()
      req.onsuccess = () => resolve(req.result as PendingSale[])
      req.onerror = () => reject(req.error)
    })
  } catch (e) {
    try {
      const key = 'pos_pending_sales_fallback_v1'
      const raw = localStorage.getItem(key)
      const arr: PendingSale[] = raw ? JSON.parse(raw) : []
      return arr
    } catch (le) { return [] }
  }
}

export async function deletePendingSale(id: string) {
  try {
    const db = await openDB()
    return new Promise<void>((resolve, reject) => {
      const tx = db.transaction(SALES_STORE, 'readwrite')
      const store = tx.objectStore(SALES_STORE)
      const req = store.delete(id)
      req.onsuccess = () => resolve()
      req.onerror = () => reject(req.error)
    })
  } catch (e) {
    try {
      const key = 'pos_pending_sales_fallback_v1'
      const raw = localStorage.getItem(key)
      const arr: any[] = raw ? JSON.parse(raw) : []
      const filtered = arr.filter(a => a.id !== id)
      localStorage.setItem(key, JSON.stringify(filtered))
      return
    } catch (le) { throw le }
  }
}

export default { addOutboxItem, getAllOutboxItems, deleteOutboxItem, updateOutboxAttempts, updateOutboxStatus, cacheProduct, cacheBarcode, lookupBarcodeCached, addPendingSale, getPendingSales, deletePendingSale }

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
