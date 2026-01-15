import { v4 as uuidv4 } from 'uuid'

type DeviceRecord = {
  deviceId: string
  createdAt: string
  version: number
}

const DB_NAME = 'pos_device_v1'
const STORE_NAME = 'device'
const KEY = 'device_record'

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1)
    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains(STORE_NAME)) db.createObjectStore(STORE_NAME)
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

async function readFromIndexedDB(): Promise<DeviceRecord | null> {
  try {
    const db = await openDB()
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly')
      const store = tx.objectStore(STORE_NAME)
      const req = store.get(KEY)
      req.onsuccess = () => resolve(req.result || null)
      req.onerror = () => reject(req.error)
    })
  } catch (e) {
    return null
  }
}

async function writeToIndexedDB(rec: DeviceRecord) {
  const db = await openDB()
  return new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite')
    const store = tx.objectStore(STORE_NAME)
    const req = store.put(rec, KEY)
    req.onsuccess = () => resolve()
    req.onerror = () => reject(req.error)
  })
}

async function readFromLocalStorage(): Promise<DeviceRecord | null> {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return null
    return JSON.parse(raw) as DeviceRecord
  } catch (e) {
    return null
  }
}

async function writeToLocalStorage(rec: DeviceRecord) {
  localStorage.setItem(KEY, JSON.stringify(rec))
}

async function readFromCacheStorage(): Promise<DeviceRecord | null> {
  try {
    if (!('caches' in window)) return null
    const cache = await caches.open(DB_NAME)
    const res = await cache.match(KEY)
    if (!res) return null
    const txt = await res.text()
    return JSON.parse(txt) as DeviceRecord
  } catch (e) {
    return null
  }
}

async function writeToCacheStorage(rec: DeviceRecord) {
  if (!('caches' in window)) return
  const cache = await caches.open(DB_NAME)
  const body = new Response(JSON.stringify(rec), { headers: { 'Content-Type': 'application/json' } })
  await cache.put(KEY, body)
}

export async function getOrCreateDeviceId(): Promise<string> {
  // Try IndexedDB
  const fromIDB = await readFromIndexedDB()
  if (fromIDB && fromIDB.deviceId) return fromIDB.deviceId

  // Try localStorage
  const fromLS = await readFromLocalStorage()
  if (fromLS && fromLS.deviceId) return fromLS.deviceId

  // Try Cache Storage
  const fromCache = await readFromCacheStorage()
  if (fromCache && fromCache.deviceId) return fromCache.deviceId

  // Create new
  const deviceId = uuidv4()
  const rec: DeviceRecord = { deviceId, createdAt: new Date().toISOString(), version: 1 }

  // Best-effort persist to all stores
  try { await writeToIndexedDB(rec) } catch (e) {}
  try { await writeToLocalStorage(rec) } catch (e) {}
  try { await writeToCacheStorage(rec) } catch (e) {}

  return deviceId
}

export default { getOrCreateDeviceId }
