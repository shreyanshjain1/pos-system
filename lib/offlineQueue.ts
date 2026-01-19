// Offline queue for pending transactions and cache
// Uses IndexedDB for persistence across page reloads

export type OutboxItem = {
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

const DB_NAME = 'pos-offline-db'
const DB_VERSION = 1
const STORE_NAME = 'outbox'
const CACHE_STORE = 'cache'
const PRODUCTS_LIST_KEY = 'products-list'

let db: IDBDatabase | null = null

async function initDB(): Promise<IDBDatabase> {
  if (db) return db

  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION)

    req.onerror = () => reject(req.error)
    req.onsuccess = () => {
      db = req.result
      resolve(db)
    }

    req.onupgradeneeded = (e) => {
      const database = (e.target as IDBOpenDBRequest).result
      if (!database.objectStoreNames.contains(STORE_NAME)) {
        database.createObjectStore(STORE_NAME, { keyPath: 'queueId' })
      }
      if (!database.objectStoreNames.contains(CACHE_STORE)) {
        database.createObjectStore(CACHE_STORE, { keyPath: 'key' })
      }
    }
  })
}

export async function addOutboxItem(
  actionType: string,
  payload: any,
  opts?: { deviceId?: string; shopId?: string; userId?: string; role?: string }
): Promise<string> {
  try {
    const database = await initDB()
    const queueId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`

    const item: OutboxItem = {
      queueId,
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

    return new Promise((resolve, reject) => {
      const tx = database.transaction(STORE_NAME, 'readwrite')
      const store = tx.objectStore(STORE_NAME)
      const req = store.add(item)

      req.onerror = () => reject(req.error)
      req.onsuccess = () => {
        broadcastDataUpdate()
        resolve(queueId)
      }
    })
  } catch (e) {
    console.error('Failed to add outbox item:', e)
    return Promise.resolve('')
  }
}

export async function getAllOutboxItems(): Promise<OutboxItem[]> {
  try {
    const database = await initDB()

    return new Promise((resolve, reject) => {
      const tx = database.transaction(STORE_NAME, 'readonly')
      const store = tx.objectStore(STORE_NAME)
      const req = store.getAll()

      req.onerror = () => reject(req.error)
      req.onsuccess = () => resolve(req.result)
    })
  } catch (e) {
    console.error('Failed to get outbox items:', e)
    return []
  }
}

export async function deleteOutboxItem(id: string): Promise<void> {
  try {
    const database = await initDB()

    return new Promise((resolve, reject) => {
      const tx = database.transaction(STORE_NAME, 'readwrite')
      const store = tx.objectStore(STORE_NAME)
      const req = store.delete(id)

      req.onerror = () => reject(req.error)
      req.onsuccess = () => {
        broadcastDataUpdate()
        resolve()
      }
    })
  } catch (e) {
    console.error('Failed to delete outbox item:', e)
  }
}

export async function updateOutboxAttempts(id: string, attempts: number): Promise<void> {
  try {
    const database = await initDB()

    return new Promise((resolve, reject) => {
      const tx = database.transaction(STORE_NAME, 'readwrite')
      const store = tx.objectStore(STORE_NAME)
      const getReq = store.get(id)

      getReq.onerror = () => reject(getReq.error)
      getReq.onsuccess = () => {
        const item = getReq.result as OutboxItem
        if (item) {
          item.retryCount = attempts
          const updateReq = store.put(item)
          updateReq.onerror = () => reject(updateReq.error)
          updateReq.onsuccess = () => {
            broadcastDataUpdate()
            resolve()
          }
        } else resolve()
      }
    })
  } catch (e) {
    console.error('Failed to update outbox attempts:', e)
  }
}

export async function updateOutboxStatus(
  id: string,
  status: 'pending' | 'synced' | 'failed',
  lastError?: string | null
): Promise<void> {
  try {
    const database = await initDB()

    return new Promise((resolve, reject) => {
      const tx = database.transaction(STORE_NAME, 'readwrite')
      const store = tx.objectStore(STORE_NAME)
      const getReq = store.get(id)

      getReq.onerror = () => reject(getReq.error)
      getReq.onsuccess = () => {
        const item = getReq.result as OutboxItem
        if (item) {
          item.status = status
          item.lastError = lastError || null
          const updateReq = store.put(item)
          updateReq.onerror = () => reject(updateReq.error)
          updateReq.onsuccess = () => {
            broadcastDataUpdate()
            resolve()
          }
        } else resolve()
      }
    })
  } catch (e) {
    console.error('Failed to update outbox status:', e)
  }
}

export async function cacheProduct(product: any): Promise<void> {
  try {
    const database = await initDB()
    const key = `product-${product.id}`

    return new Promise((resolve, reject) => {
      const tx = database.transaction(CACHE_STORE, 'readwrite')
      const store = tx.objectStore(CACHE_STORE)
      const req = store.put({ key, data: product, timestamp: Date.now() })

      req.onerror = () => reject(req.error)
      req.onsuccess = () => resolve()
    })
  } catch (e) {
    console.error('Failed to cache product:', e)
  }
}

export async function cacheBarcode(code: string, product: any): Promise<void> {
  try {
    const database = await initDB()
    const key = `barcode-${code}`

    return new Promise((resolve, reject) => {
      const tx = database.transaction(CACHE_STORE, 'readwrite')
      const store = tx.objectStore(CACHE_STORE)
      const req = store.put({ key, data: product, timestamp: Date.now() })

      req.onerror = () => reject(req.error)
      req.onsuccess = () => resolve()
    })
  } catch (e) {
    console.error('Failed to cache barcode:', e)
  }
}

export async function lookupBarcodeCached(code: string): Promise<any | null> {
  try {
    const database = await initDB()
    const key = `barcode-${code}`

    return new Promise((resolve, reject) => {
      const tx = database.transaction(CACHE_STORE, 'readonly')
      const store = tx.objectStore(CACHE_STORE)
      const req = store.get(key)

      req.onerror = () => reject(req.error)
      req.onsuccess = () => resolve(req.result?.data || null)
    })
  } catch (e) {
    console.error('Failed to lookup cached barcode:', e)
    return null
  }
}

export async function cacheProductsList(products: any[]): Promise<void> {
  try {
    const database = await initDB()

    return new Promise((resolve, reject) => {
      const tx = database.transaction(CACHE_STORE, 'readwrite')
      const store = tx.objectStore(CACHE_STORE)
      const req = store.put({ key: PRODUCTS_LIST_KEY, data: products, timestamp: Date.now() })

      req.onerror = () => reject(req.error)
      req.onsuccess = () => resolve()
    })
  } catch (e) {
    console.error('Failed to cache products list:', e)
  }
}

export async function getCachedProductsList(): Promise<any[]> {
  try {
    const database = await initDB()

    return new Promise((resolve, reject) => {
      const tx = database.transaction(CACHE_STORE, 'readonly')
      const store = tx.objectStore(CACHE_STORE)
      const req = store.get(PRODUCTS_LIST_KEY)

      req.onerror = () => reject(req.error)
      req.onsuccess = () => resolve(req.result?.data || [])
    })
  } catch (e) {
    console.error('Failed to get cached products list:', e)
    return []
  }
}

export async function addPendingSale(sale: any): Promise<void> {
  try {
    const database = await initDB()
    const key = `pending-sale-${sale.id || Date.now()}`

    return new Promise((resolve, reject) => {
      const tx = database.transaction(CACHE_STORE, 'readwrite')
      const store = tx.objectStore(CACHE_STORE)
      const req = store.put({ key, data: sale, timestamp: Date.now() })

      req.onerror = () => reject(req.error)
      req.onsuccess = () => {
        broadcastDataUpdate()
        resolve()
      }
    })
  } catch (e) {
    console.error('Failed to add pending sale:', e)
  }
}

export async function getPendingSales(): Promise<any[]> {
  try {
    const database = await initDB()

    return new Promise((resolve, reject) => {
      const tx = database.transaction(CACHE_STORE, 'readonly')
      const store = tx.objectStore(CACHE_STORE)
      const req = store.getAll()

      req.onerror = () => reject(req.error)
      req.onsuccess = () => {
        const items = req.result.filter((item: any) => item.key.startsWith('pending-sale-'))
        resolve(items.map((item: any) => item.data))
      }
    })
  } catch (e) {
    console.error('Failed to get pending sales:', e)
    return []
  }
}

export async function deletePendingSale(id: string): Promise<void> {
  try {
    const database = await initDB()
    const key = `pending-sale-${id}`

    return new Promise((resolve, reject) => {
      const tx = database.transaction(CACHE_STORE, 'readwrite')
      const store = tx.objectStore(CACHE_STORE)
      const req = store.delete(key)

      req.onerror = () => reject(req.error)
      req.onsuccess = () => {
        broadcastDataUpdate()
        resolve()
      }
    })
  } catch (e) {
    console.error('Failed to delete pending sale:', e)
  }
}

export function broadcastDataUpdate(): void {
  try {
    if (typeof BroadcastChannel !== 'undefined') {
      const bc = new BroadcastChannel('pos-updates')
      bc.postMessage({ type: 'data-updated', at: Date.now() })
      bc.close()
      return
    }
  } catch (_) {}
  try {
    localStorage.setItem('pos:data-updated', String(Date.now()))
  } catch (_) {}
}

export default {
  addOutboxItem,
  getAllOutboxItems,
  deleteOutboxItem,
  updateOutboxAttempts,
  updateOutboxStatus,
  cacheProduct,
  cacheBarcode,
  lookupBarcodeCached,
  cacheProductsList,
  getCachedProductsList,
  addPendingSale,
  getPendingSales,
  deletePendingSale,
}
