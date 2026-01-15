/* Simple service worker: precache app shell and runtime cache GET requests (stale-while-revalidate) */
const CACHE_NAME = 'pos-app-v1'
const PRECACHE_URLS = [ '/', '/_next/static/', '/favicon.ico' ]

self.addEventListener('install', event => {
  self.skipWaiting()
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(PRECACHE_URLS).catch(() => {}))
  )
})

self.addEventListener('activate', event => {
  event.waitUntil(self.clients.claim())
})

self.addEventListener('fetch', event => {
  const req = event.request
  if (req.method !== 'GET') return
  // For navigation and static assets, try cache then network
  event.respondWith(
    caches.match(req).then(cached => {
      const networkFetch = fetch(req).then(resp => {
        const copy = resp.clone()
        caches.open(CACHE_NAME).then(c => c.put(req, copy)).catch(() => {})
        return resp
      }).catch(() => cached)
      return cached || networkFetch
    })
  )
})
