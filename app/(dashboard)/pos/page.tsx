"use client"
import React, { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Modal from '@/components/ui/Modal'
import Input from '@/components/ui/Input'
import SectionErrorBoundary from '@/components/ui/SectionErrorBoundary'
import formatCurrency from '@/lib/format/currency'
import supabase from '@/lib/supabase/client'
import fetchWithAuth from '@/lib/fetchWithAuth'
import { getOrCreateDeviceId } from '@/lib/devices'
import BarcodeScanListener from '@/components/scan/BarcodeScanListener'
import ThermalReceipt from '@/components/print/ThermalReceipt'
import ReceiptPreview from '@/components/print/ReceiptPreview'
import { useRef } from 'react'
import { validateCheckoutForm, validateProductForm, getFieldError } from '@/lib/validation'
import { usePOSSettings } from '@/lib/usePOSSettings'
import { useOfflineQueue } from '@/hooks/useOfflineQueue'
import { startAutoSync, flushOnce } from '@/lib/offlineSync'
import { cacheProductsList, getCachedProductsList, getAllOutboxItems, updateOutboxStatus, updateOutboxAttempts, cacheBarcode, lookupBarcodeCached } from '@/lib/offlineQueue'

type Product = { id: string; name: string; price: number; stock: number; barcode?: string; min_stock?: number; max_stock?: number }
type CartItem = { product: Product; qty: number }

export default function POSPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [search, setSearch] = useState<string>('')
  const [searchResults, setSearchResults] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [cart, setCart] = useState<CartItem[]>([])
  const [error, setError] = useState<string | null>(null)
  const [checkingOut, setCheckingOut] = useState(false)
  const [receipt, setReceipt] = useState<Record<string, unknown> | null>(null)
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [paymentAmount, setPaymentAmount] = useState<string>('')
  const [showScanner, setShowScanner] = useState(false)
  const [scanError, setScanError] = useState<string | null>(null)
  const [manualBarcode, setManualBarcode] = useState<string>('')
  const [scanMessage, setScanMessage] = useState<string | null>(null)
  const [createBarcodeModalOpen, setCreateBarcodeModalOpen] = useState(false)
  const [pendingBarcodeToCreate, setPendingBarcodeToCreate] = useState<string | null>(null)
  const [createName, setCreateName] = useState<string>('')
  const [createPrice, setCreatePrice] = useState<string>('0')
  const [createStock, setCreateStock] = useState<string>('0')
  const [scannerDeviceId, setScannerDeviceId] = useState<string | null>(null)
  const [scannerMode, setScannerMode] = useState<'keyboard'>('keyboard')
  const [realtimeMessage, setRealtimeMessage] = useState<string | null>(null)
  const [realtimeStatus, setRealtimeStatus] = useState<'idle'|'connecting'|'connected'|'error'|'polling'>('idle')
  const [lastRealtimeAt, setLastRealtimeAt] = useState<number | null>(null)
  const [subscriptionPlan, setSubscriptionPlan] = useState<string | null>(null)
  const [subscriptionActive, setSubscriptionActive] = useState<boolean>(true)
  const { settings, saveSettings } = usePOSSettings()
  const [layoutMode, setLayoutMode] = useState<'side'|'stacked'>(settings.layout as 'side'|'stacked' || 'side')
  const [paymentError, setPaymentError] = useState<string | null>(null)
  const [createProductErrors, setCreateProductErrors] = useState<string | null>(null)
  const { isOnline, pendingCount, failedCount, queueCheckout } = useOfflineQueue()
  const [hydrated, setHydrated] = useState(false)
  const [usingCachedProducts, setUsingCachedProducts] = useState(false)
  const pollTimerRef = useRef<number | null>(null)
  const inspectTimerRef = useRef<number | null>(null)
  const pendingRealtimeRef = useRef<Record<string, unknown>[]>([])
  const realtimeDebounceRef = useRef<number | null>(null)
  const [isMobile, setIsMobile] = useState(false)
  const [showCartModal, setShowCartModal] = useState(false)

  useEffect(() => {
    // initial load
    fetchProducts()

    // mark hydration complete to avoid SSR/CSR mismatches for offline badges
    setHydrated(true)

    // Start auto-sync for offline queue
    const stopSync = startAutoSync({ intervalMs: 30000 })

    // load subscription metadata for UI gating
    ;(async () => {
      try {
        const res = await fetchWithAuth('/api/subscription')
        if (res.ok) {
          const sj = await res.json().catch(() => ({}))
          // normalize plan and active flag
          const planRaw = (sj?.plan ?? null)
          const plan = planRaw ? String(planRaw).toLowerCase() : null
          setSubscriptionPlan(plan === 'advanced' ? 'advance' : plan)
          setSubscriptionActive(Boolean(sj?.active))
        } else {
          // If server rejects, fall back to basic but keep active to allow offline use
          setSubscriptionPlan('basic')
          setSubscriptionActive(true)
        }
      } catch (_) {
        // If offline or fetch fails, keep user working: basic + active
        setSubscriptionPlan(prev => prev ?? 'basic')
        setSubscriptionActive(true)
      }
    })()

    // Mobile detection
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768)
    }
    checkMobile()
    window.addEventListener('resize', checkMobile)

    // load scanner settings
    try {
      const raw = localStorage.getItem('pos:settings')
      if (raw) {
        const cfg = JSON.parse(raw || '{}')
        if (cfg.scannerDeviceId) setScannerDeviceId(cfg.scannerDeviceId)
        if (cfg.scannerMode) setScannerMode(cfg.scannerMode)
        if (cfg.layout) setLayoutMode(cfg.layout === 'stacked' ? 'stacked' : 'side')
      }
    } catch (_) {}

    const onSettingsUpdate = () => {
      try {
        const raw = localStorage.getItem('pos:settings')
        if (raw) {
          const cfg = JSON.parse(raw || '{}')
          if (cfg.scannerDeviceId) setScannerDeviceId(cfg.scannerDeviceId)
          if (cfg.scannerMode) setScannerMode(cfg.scannerMode)
        }
      } catch (_) {}
    }
    try { (window as any).addEventListener('pos:settings:updated', onSettingsUpdate) } catch (_) {}

    // Attempt to enable Supabase realtime for products. If realtime fails
    // fall back to lightweight polling. Debounce rapid events to avoid
    // excessive product fetches.
    (async () => {
      try {
        setRealtimeStatus('connecting')
        const channel = (supabase as any).channel?.('products:client')
          ?.on('postgres_changes', { event: '*', schema: 'public', table: 'products' }, (payload: any) => {
            setLastRealtimeAt(Date.now())
            setRealtimeStatus('connected')
            pendingRealtimeRef.current.push(payload)
            try { if (realtimeDebounceRef.current) window.clearTimeout(realtimeDebounceRef.current) } catch (_) {}
            realtimeDebounceRef.current = window.setTimeout(() => {
              // clear queue and refresh products
              pendingRealtimeRef.current = []
              fetchProducts({ skipLoading: true })
            }, 250)
          })
          ?.subscribe()

        // If channel subscription didn't exist, mark as polling
        if (!channel) throw new Error('Realtime channel unavailable')

        // store channel on ref for cleanup
        ;(pollTimerRef as any).channel = channel
      } catch (e) {
        // Realtime unavailable — enable polling every 8s
        setRealtimeStatus('polling')
        try { if (pollTimerRef.current) window.clearInterval(pollTimerRef.current) } catch (_) {}
        pollTimerRef.current = window.setInterval(() => fetchProducts({ skipLoading: true }), 8000) as unknown as number
      }
    })()

    return () => {
      stopSync()
      try { if (inspectTimerRef.current) window.clearInterval(inspectTimerRef.current) } catch (_) {}
      try {
        // cleanup realtime channel if created
        const ch = (pollTimerRef as any).channel
        if (ch) {
          try { ch.unsubscribe?.() } catch (_) {}
          try { ;(supabase as any).removeChannel?.(ch) } catch (_) {}
        }
      } catch (_) {}
      try { if (pollTimerRef.current) window.clearInterval(pollTimerRef.current) } catch (_) {}
      try { (window as any).removeEventListener('pos:settings:updated', onSettingsUpdate) } catch (_) {}
      try { window.removeEventListener('resize', checkMobile) } catch (_) {}
      try { if (typeof BroadcastChannel !== 'undefined') {
        const bc = new BroadcastChannel('pos-updates')
        bc.close()
      } } catch (_) {}
      try { window.removeEventListener('storage', () => {}) } catch (_) {}
    }
  }, [])

  // Listen for updates from other tabs/clients and refresh products
  useEffect(() => {
    let bc: BroadcastChannel | null = null
    try {
      if (typeof BroadcastChannel !== 'undefined') {
        bc = new BroadcastChannel('pos-updates')
        bc.onmessage = () => { fetchProducts({ skipLoading: true }) }
      }
    } catch (_) { bc = null }

    const storageListener = (e: StorageEvent) => {
      if (e.key === 'pos:data-updated') fetchProducts({ skipLoading: true })
    }
    try { window.addEventListener('storage', storageListener) } catch (_) {}

    return () => {
      try { if (bc) bc.close() } catch (_) {}
      try { window.removeEventListener('storage', storageListener) } catch (_) {}
    }
  }, [])

  // Device-ID based enforcement removed: allow all devices to create/checkout

  // Offline sync removed: no background queue or periodic sync


  async function fetchProducts(opts?: { skipLoading?: boolean }) {
    const skipLoading = opts?.skipLoading === true
    if (!skipLoading) setLoading(true)

    // If offline, try cached products immediately
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      const cached = await getCachedProductsList()
      if (cached.length > 0) {
        setProducts(cached as Product[])
        setUsingCachedProducts(true)
        if (!skipLoading) setLoading(false)
        return
      }
    }

    try {
      // Attach current user's access token so server can scope by shop
      const res = await fetchWithAuth('/api/products')
      const json: unknown = await res.json()
      if (!res.ok) {
        const errMsg = typeof json === 'object' && json !== null ? (json as Record<string, unknown>)['error'] : undefined
        throw new Error((errMsg as string) || 'Failed to load')
      }
      const obj = typeof json === 'object' && json !== null ? (json as Record<string, unknown>) : {}
      const list = (obj['data'] ?? []) as Product[]
      setProducts(list)
      setUsingCachedProducts(false)
      // Cache for offline use
      cacheProductsList(list).catch(err => console.error('Cache products failed:', err))
      // Cache barcodes for offline lookup
      Promise.all(
        list
          .filter(p => Boolean(p.barcode))
          .map(p => cacheBarcode(String(p.barcode), p).catch(err => console.error('Cache barcode failed:', err)))
      ).catch(() => {})
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      const cached = await getCachedProductsList()
      if (cached.length > 0) {
        setProducts(cached as Product[])
        setUsingCachedProducts(true)
        if (!skipLoading) setError('Offline. Showing cached products.')
      } else {
        if (!skipLoading) setError(msg || 'Failed to load')
      }
    } finally {
      if (!skipLoading) setLoading(false)
    }
  }

  function applyLocalStockAdjustments(items: { product_id: string; quantity: number }[]) {
    setProducts(prev => {
      const updated = prev.map(p => {
        const match = items.find(i => i.product_id === p.id)
        if (!match) return p
        const newStock = Math.max(0, (p.stock ?? 0) - match.quantity)
        return { ...p, stock: newStock }
      })
      // persist to cache for offline views
      cacheProductsList(updated).catch(err => console.error('Cache products failed:', err))
      return updated
    })
  }

  function addToCart(p: Product) {
    // Allow offline use even if subscription check failed; only block when we positively know it's inactive while online
    if (!subscriptionActive && isOnline) {
      setError('Subscription required or expired')
      return
    }
    setCart(prev => {
      const found = prev.find(i => i.product.id === p.id)
      if (found) return prev.map(i => i.product.id === p.id ? { ...i, qty: Math.min(i.qty + 1, p.stock) } : i)
      return [...prev, { product: p, qty: 1 }]
    })
  }

  function handleBarcodeDetected(code: string) {
    const normalized = String(code || '').trim()
    console.debug('Barcode detected:', normalized)
    if (!normalized) {
      setScanError('Detected empty barcode')
      return
    }

    const prod = products.find(p => p.barcode && String(p.barcode).trim() === normalized)
    if (prod) {
      console.debug('Matched product:', prod.id, prod.name)
      addToCart(prod)
      setError(null)
      setScanError(null)
      setScanMessage(`${prod.name} added`)
      setManualBarcode('')
      setTimeout(() => setScanMessage(null), 1400)
      return
    }

    // Offline fallback for Pro/Advance: lookup cached barcode
    const isProOrAdvance = (subscriptionPlan === 'pro' || subscriptionPlan === 'advance')
    if (!isOnline && isProOrAdvance) {
      lookupBarcodeCached(normalized).then(found => {
        if (found) {
          addToCart(found as Product)
          setError(null)
          setScanError(null)
          setScanMessage(`${(found as Product).name} added (cached)`) 
          setManualBarcode('')
          setTimeout(() => setScanMessage(null), 1400)
        } else {
          setScanError('Barcode not found in cache (offline)')
        }
      }).catch(() => setScanError('Barcode lookup failed offline'))
      return
    }

    console.warn('No product found for barcode:', normalized)
    setScanError(`No product found for barcode: ${normalized}`)
    setError(`No product found for barcode: ${normalized}`)
    setPendingBarcodeToCreate(normalized)
    setCreateName('')
    setCreatePrice('0')
    setCreateStock('0')
    setCreateBarcodeModalOpen(true)
  }

  function handleManualAdd() {
    const code = String(manualBarcode || '').trim()
    if (!code) return setScanError('Enter a barcode')
    handleBarcodeDetected(code)
  }

  useEffect(() => {
    if (!showScanner) return
    // when scanner modal opens and mode is keyboard, focus manual input
    if (scannerMode === 'keyboard') {
      setTimeout(() => {
        const el = document.querySelector('input[placeholder="Type or paste barcode, press Enter"]') as HTMLInputElement | null
        if (el) el.focus()
      }, 200)
    }
  }, [showScanner, scannerMode])

  function changeQty(productId: string, qty: number) {
    setCart(prev => prev.map(i => i.product.id === productId ? { ...i, qty } : i).filter(i => i.qty > 0))
  }

  function removeItem(productId: string) {
    setCart(prev => prev.filter(i => i.product.id !== productId))
  }

  function computeTotal() {
    return cart.reduce((s, i) => s + i.product.price * i.qty, 0)
  }

  function handleCheckout() {
    if (cart.length === 0) return setError('Cart is empty')
    setError(null)
    // open payment modal and prefill with total
    const total = computeTotal()
    setPaymentAmount(String(total))
    setShowPaymentModal(true)
    if (isMobile) setShowCartModal(false)
  }

  async function performCheckout(payment: number) {
    setCheckingOut(true)
    setPaymentError(null)
    setError(null)

    // Validate payment amount
    const total = computeTotal()
    const validation = validateCheckoutForm({ paymentAmount: payment, total })
    if (!validation.valid) {
      setPaymentError(validation.errors[0]?.message || 'Invalid payment amount')
      setCheckingOut(false)
      return
    }

    const items = cart.map(i => ({ product_id: i.product.id, quantity: i.qty, price: i.product.price }))
    const change = Number((payment - total).toFixed(2))
    const payload: Record<string, unknown> = { items, total, payment_method: 'cash', payment, change }

    try {
      // include auth token and device id so backend assigns correct shop and validates ownership
      const _did = await getOrCreateDeviceId()
      const res = await fetchWithAuth('/api/checkout', { method: 'POST', headers: { 'content-type': 'application/json', 'x-device-id': _did ?? '' }, body: JSON.stringify({ ...payload, deviceId: _did }) })
      const json: unknown = await res.json()
      if (!res.ok) {
        const errMsg = typeof json === 'object' && json !== null ? (json as Record<string, unknown>)['error'] : undefined
        throw new Error((errMsg as string) || 'Checkout failed')
      }

      // attach payment and change to receipt for display if backend doesn't include them
      const receiptData: unknown = typeof json === 'object' && json !== null ? ((json as Record<string, unknown>)['data'] ?? json) : json
      if (receiptData && typeof receiptData === 'object') {
        const rd = receiptData as Record<string, unknown>
        const sale = (rd['sale'] ?? rd) as Record<string, unknown>
        if (sale) {
          if (sale['payment'] === undefined) sale['payment'] = payment
          if (sale['change'] === undefined) sale['change'] = change
        }
      }
      setReceipt((receiptData as Record<string, unknown>) ?? null)
      setShowPaymentModal(false)
      setCart([])
      fetchProducts()
      // UI refreshed via fetchProducts and realtime/polling
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      // If offline, queue the transaction for later sync
      if (!isOnline) {
        try {
          const _did = await getOrCreateDeviceId()
          await queueCheckout({ ...payload, deviceId: _did })
          setPaymentError('No internet connection. Transaction queued and will sync when online.')
          // Apply local stock decrement to prevent overselling while offline
          applyLocalStockAdjustments(items)
          setReceipt({ items, total, payment, change, offline: true })
          setShowPaymentModal(false)
          setCart([])
        } catch (queueErr) {
          setPaymentError('Failed to queue transaction: ' + (queueErr instanceof Error ? queueErr.message : String(queueErr)))
          // Keep cart intact on error - don't clear
        }
      } else {
        setPaymentError(msg || 'Checkout failed')
        // Keep cart intact on error - don't clear
      }
    } finally {
      setCheckingOut(false)
    }
  }

  async function retryFailedSync() {
    try {
      const items = await getAllOutboxItems()
      const failed = items.filter(i => i.status === 'failed')
      if (failed.length === 0) {
        setRealtimeMessage('No failed transactions to retry')
        return
      }

      await Promise.all(
        failed.map(i => Promise.all([
          updateOutboxStatus(i.queueId, 'pending', null),
          updateOutboxAttempts(i.queueId, 0),
        ]))
      )

      setRealtimeMessage('Retrying failed transactions…')
      await flushOnce()
      const remaining = (await getAllOutboxItems()).filter(i => i.status === 'failed').length
      setRealtimeMessage(remaining === 0 ? 'All retries queued' : `${remaining} failed after retry`)
    } catch (err) {
      setError('Retry failed: ' + (err instanceof Error ? err.message : String(err)))
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8, scale: 0.992 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 8, scale: 0.992 }}
      transition={{ duration: 0.28 }}
      className="min-h-screen bg-gray-50/60 p-6"
    >
      {/* Offline indicator and queued transactions */}
      <div className="flex justify-between items-center mb-4">
        <div>
          {hydrated && (
            <>
              {!isOnline && <div className="inline-block px-3 py-1 bg-amber-100 text-amber-900 rounded-lg text-sm font-medium">🔴 Offline</div>}
              {pendingCount > 0 && <div className="inline-block ml-2 px-3 py-1 bg-blue-100 text-blue-900 rounded-lg text-sm font-medium">{pendingCount} transaction{pendingCount !== 1 ? 's' : ''} queued</div>}
              {failedCount > 0 && <div className="inline-block ml-2 px-3 py-1 bg-red-100 text-red-900 rounded-lg text-sm font-medium">{failedCount} failed sync</div>}
              {usingCachedProducts && <div className="inline-block ml-2 px-3 py-1 bg-slate-100 text-slate-800 rounded-lg text-sm font-medium">Cached products</div>}
            </>
          )}
        </div>
        <div className="text-sm text-gray-600">
          Realtime: <strong className={`${realtimeStatus === 'connected' ? 'text-emerald-600' : realtimeStatus === 'polling' ? 'text-amber-600' : realtimeStatus === 'error' ? 'text-red-600' : 'text-gray-700'}`}>{realtimeStatus}</strong>
          {lastRealtimeAt ? <span className="ml-2">Last: {new Date(lastRealtimeAt).toLocaleTimeString()}</span> : null}
        </div>
        {hydrated && failedCount > 0 && (
          <div className="ml-4">
            <Button variant="secondary" onClick={retryFailedSync}>Retry failed</Button>
          </div>
        )}
      </div>
      
      <div className="max-w-7xl mx-auto">

      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="m-0 text-2xl md:text-3xl font-extrabold tracking-tight">Point of Sale</h2>
          <p className="text-gray-500">Quickly add products to the cart and checkout</p>
        </div>
          <div className="flex items-center gap-2">
            <Input
            type="search"
            placeholder="Search products by name or barcode"
            value={search}
            onChange={e => setSearch(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') {
              const q = String(search || '').trim().toLowerCase()
              if (!q) return
              const exact = products.find(p => (p.barcode && p.barcode === q) || p.name.toLowerCase() === q)
              if (exact) { addToCart(exact); setSearch(''); setSearchResults([]); }
            } }}
              className="w-full max-w-xs md:max-w-md rounded-full shadow-sm ring-1 ring-gray-100 focus:ring-2 focus:ring-emerald-300"
          />
          {(subscriptionPlan === 'pro' || subscriptionPlan === 'advance') && subscriptionActive && (
            <Button onClick={() => setShowScanner(true)} className="ml-2">Scan</Button>
          )}
          {/* layout toggle stored in server settings */}
          <div className="ml-2">
            <button className="px-2 py-1 border rounded" onClick={() => {
              const next = layoutMode === 'side' ? 'stacked' : 'side'
              setLayoutMode(next)
              saveSettings({ layout: next })
            }}>{layoutMode === 'side' ? 'Side' : 'Stacked'}</button>
          </div>
        </div>
      </div>

      <div className="grid gap-4 sm:gap-6 grid-cols-1 lg:grid-cols-[1fr_380px] xl:grid-cols-[1fr_420px]">
        <div>
          <SectionErrorBoundary section="Product List">
            <Card className="p-4 bg-white/80 backdrop-blur-sm">
              {loading ? (
                <div className="animate-pulse bg-gray-100 rounded-lg h-60" />
              ) : error ? (
                <div className="text-red-600">{error}</div>
              ) : (
                <div>
                  {search ? (
                    <div className="mb-3">
                      {products.filter(p => p.name.toLowerCase().includes(search.toLowerCase()) || (p.barcode || '').toLowerCase().includes(search.toLowerCase())).slice(0, 8).map(p => (
                        <div key={p.id} className="p-3 border-b border-gray-100 flex justify-between items-center hover:bg-gray-50 transition">
                          <div>
                            <div className="font-semibold">{p.name}</div>
                            <div className="text-sm text-gray-400">{p.barcode ?? '—'}</div>
                          </div>
                          <div>
                            <Button onClick={() => { addToCart(p); setSearch('') }} className="px-3 py-1">Add</Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : null}

                  <div className="grid gap-3 sm:gap-4 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                  {products.map(p => (
                    <motion.div
                      key={p.id}
                      whileHover={{ scale: p.stock > 0 ? 1.02 : 1 }}
                      transition={{ type: 'spring', stiffness: 260, damping: 20 }}
                      role={p.stock > 0 ? 'button' : undefined}
                      tabIndex={p.stock > 0 ? 0 : -1}
                      onClick={() => { if (p.stock > 0) addToCart(p) }}
                      onKeyDown={(e) => { if (p.stock > 0 && e.key === 'Enter') addToCart(p) }}
                      className={`relative group bg-white rounded-xl border border-gray-100 p-4 cursor-pointer shadow-sm hover:shadow-lg transform transition-all duration-200 ${p.stock <= 0 ? 'opacity-60 cursor-not-allowed grayscale' : ''}`}
                    >
                      {/* Low stock badge for Pro+ */}
                      {(subscriptionPlan === 'pro' || subscriptionPlan === 'advance') && subscriptionActive && (p.min_stock ?? 0) >= 0 && p.stock <= (p.min_stock ?? 0) && (
                        <div className="absolute right-3 top-3 bg-red-600 text-white text-xs px-2 py-1 rounded">Low</div>
                      )}
                      <div className="font-semibold text-gray-800 group-hover:text-emerald-600">{p.name}</div>
                      {p.barcode ? <div className="text-sm text-gray-400 mt-1">Barcode: {p.barcode}</div> : null}
                      <div className="text-lg font-extrabold mt-3">{formatCurrency(p.price)}</div>
                      <div className="text-sm text-gray-500 mt-1">{p.stock > 0 ? `In stock: ${p.stock}` : 'Out of stock'}</div>
                    </motion.div>
                  ))}
                  </div>
                </div>
              )}
            </Card>
          </SectionErrorBoundary>
        </div>

        {!isMobile && (
          <div>
            <SectionErrorBoundary section="Shopping Cart">
              <Card className="p-4 sticky top-20 bg-white/90 backdrop-blur-sm">
                <h3 className="mt-0 text-lg font-semibold">Cart</h3>
                {cart.length === 0 ? (
                  <div className="text-gray-500">Cart is empty</div>
                ) : (
                  <div>
                    {cart.map(i => (
                      <div key={i.product.id} className="flex items-center justify-between gap-3 p-3 rounded-lg bg-gray-50 border border-gray-100 mb-3">
                        <div className="flex-1">
                          <div className="font-semibold text-gray-800">{i.product.name}</div>
                          <div className="text-sm text-gray-500">{formatCurrency(i.product.price * i.qty)} ({i.qty}×)</div>
                        </div>

                        <div className="flex items-center gap-3">
                          <div className="flex items-center gap-2">
                            <button className="w-9 h-9 flex items-center justify-center rounded-lg border border-gray-200 bg-white hover:bg-gray-100" aria-label="Decrease quantity" onClick={() => changeQty(i.product.id, Math.max(1, i.qty - 1))}>−</button>
                            <input className="w-14 text-center rounded-md border border-gray-200 px-2 py-1" type="number" value={i.qty} min={1} max={i.product.stock} onChange={e => changeQty(i.product.id, Math.max(1, Number(e.target.value) || 1))} />
                            <button className="w-9 h-9 flex items-center justify-center rounded-lg border border-gray-200 bg-white hover:bg-gray-100" aria-label="Increase quantity" onClick={() => changeQty(i.product.id, Math.min(i.product.stock, i.qty + 1))}>+</button>
                          </div>

                          <button className="w-9 h-9 rounded-lg border border-gray-200 bg-white flex items-center justify-center hover:bg-gray-50" title="Remove" onClick={() => removeItem(i.product.id)} aria-label="Remove item">
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                              <polyline points="3 6 5 6 21 6" />
                              <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                              <path d="M10 11v6" />
                              <path d="M14 11v6" />
                              <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    ))}

                    <div className="mt-3 flex justify-between items-center">
                      <div className="font-bold">Total</div>
                      <div className="font-bold">{formatCurrency(computeTotal())}</div>
                    </div>

                    <div className="mt-3">
                      <Button onClick={handleCheckout} disabled={checkingOut}>{checkingOut ? 'Processing...' : 'Checkout'}</Button>
                    </div>
                  </div>
                )}
              </Card>
            </SectionErrorBoundary>
          </div>
        )}
      </div>
      <Modal open={!!receipt} onClose={() => setReceipt(null)} title="Receipt">
        <div className="w-full max-w-md">
          <SectionErrorBoundary section="Receipt">
            <Card>
              <h3 className="mt-0 text-lg font-semibold">Receipt</h3>
              {receipt ? (() => {
                  const saleSource = (receipt && ((receipt as Record<string, unknown>)['sale'] ?? receipt)) as Record<string, unknown>
                  const itemsRaw = ((receipt as Record<string, unknown>)['items'] ?? saleSource['items']) as unknown[] | undefined
                  const items = (itemsRaw || []).map((it: unknown) => {
                    const row = (typeof it === 'object' && it !== null) ? (it as Record<string, unknown>) : {}
                    return {
                    name: (row['name'] ?? row['product_name'] ?? row['product_id'] ?? 'Item') as string,
                    qty: Number(row['quantity'] ?? row['qty'] ?? 1),
                    price: Number((row['price'] ?? row['unit_price'] ?? 0) || 0),
                  }
                })
                const total = Number((saleSource['total'] ?? (receipt as Record<string, unknown>)['total']) ?? 0) || items.reduce((s: number, i: { qty: number; price: number }) => s + i.qty * i.price, 0)
                const saleObj = {
                  id: (saleSource['id'] ?? saleSource['sale_id'] ?? (receipt as Record<string, unknown>)['sale_id']) as string | undefined,
                  created_at: (saleSource['created_at'] ?? saleSource['createdAt'] ?? (receipt as Record<string, unknown>)['created_at']) as string | undefined,
                  items,
                  total,
                  payment: (saleSource['payment'] ?? (receipt as Record<string, unknown>)['payment']) as number | undefined,
                  change: (saleSource['change'] ?? (receipt as Record<string, unknown>)['change']) as number | undefined,
                }

                return (
                  <div className="flex flex-col items-center gap-3">
                    <div className="max-h-[60vh] overflow-auto w-full flex justify-center">
                      <ReceiptPreview
                        storeName={typeof window !== 'undefined' ? (localStorage.getItem('pos:settings') ? JSON.parse(localStorage.getItem('pos:settings') as string).storeName : 'Store') : 'Store'}
                        header={typeof window !== 'undefined' ? (localStorage.getItem('pos:settings') ? JSON.parse(localStorage.getItem('pos:settings') as string).receiptHeader : '') : ''}
                        footer={typeof window !== 'undefined' ? (localStorage.getItem('pos:settings') ? JSON.parse(localStorage.getItem('pos:settings') as string).receiptFooter : '') : ''}
                        items={items}
                        total={total}
                        payment={saleObj.payment}
                        change={saleObj.change}
                        currency={typeof window !== 'undefined' ? (localStorage.getItem('pos:settings') ? JSON.parse(localStorage.getItem('pos:settings') as string).currency : 'PHP') : 'PHP'}
                      />
                    </div>

                    <ThermalReceipt sale={saleObj} />
                  </div>
                )
              })() : null}

              <div className="mt-3 flex justify-end gap-2">
                <Button onClick={() => window.print()} variant="primary">Print receipt</Button>
                <Button onClick={() => { setReceipt(null) }} variant="secondary">Close</Button>
              </div>
            </Card>
          </SectionErrorBoundary>
        </div>
      </Modal>

      {/* Device-ID banner checks removed; device-specific restrictions disabled */}

      {/* Floating cart button for mobile */}
      {isMobile && (
        <>
          <button aria-label="Open cart" onClick={() => setShowCartModal(true)} className="fixed right-4 bottom-6 z-50 w-14 h-14 rounded-full bg-emerald-600 text-white flex items-center justify-center shadow-lg">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className="text-white">
              <path d="M6 6h15l-1.5 9h-12z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              <circle cx="10" cy="20" r="1" fill="currentColor" />
              <circle cx="18" cy="20" r="1" fill="currentColor" />
            </svg>
            {cart.length > 0 && <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center font-bold">{cart.length}</span>}
          </button>

          <Modal open={showCartModal} onClose={() => setShowCartModal(false)} title="Cart">
            <div className="w-full max-w-md p-3">
              <Card>
                <h3 className="text-lg font-semibold">Cart</h3>
                {cart.length === 0 ? (
                  <div className="text-gray-500">Cart is empty</div>
                ) : (
                  <div>
                    {cart.map(i => (
                      <div key={i.product.id} className="flex items-center justify-between gap-3 p-3 rounded-lg bg-white shadow-sm mb-3">
                        <div className="flex-1">
                          <div className="font-semibold">{i.product.name}</div>
                          <div className="text-sm text-gray-500">{formatCurrency(i.product.price * i.qty)} ({i.qty}×)</div>
                        </div>

                        <div className="flex items-center gap-3">
                          <div className="flex items-center gap-2">
                            <button className="w-9 h-9 flex items-center justify-center rounded-lg border border-gray-200 bg-gray-50 hover:bg-gray-100" aria-label="Decrease quantity" onClick={() => changeQty(i.product.id, Math.max(1, i.qty - 1))}>−</button>
                            <input className="w-14 text-center rounded-md border border-gray-200 px-2 py-1" type="number" value={i.qty} min={1} max={i.product.stock} onChange={e => changeQty(i.product.id, Math.max(1, Number(e.target.value) || 1))} />
                            <button className="w-9 h-9 flex items-center justify-center rounded-lg border border-gray-200 bg-gray-50 hover:bg-gray-100" aria-label="Increase quantity" onClick={() => changeQty(i.product.id, Math.min(i.product.stock, i.qty + 1))}>+</button>
                          </div>

                          <button className="w-9 h-9 rounded-lg border border-gray-200 bg-white flex items-center justify-center hover:bg-gray-50" title="Remove" onClick={() => removeItem(i.product.id)} aria-label="Remove item">
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                              <polyline points="3 6 5 6 21 6" />
                              <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                              <path d="M10 11v6" />
                              <path d="M14 11v6" />
                              <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    ))}

                    <div className="mt-3 flex justify-between items-center">
                      <div className="font-bold">Total</div>
                      <div className="font-bold">{formatCurrency(computeTotal())}</div>
                    </div>

                    <div className="mt-3">
                      <Button onClick={() => { setShowPaymentModal(true); setShowCartModal(false) }} disabled={checkingOut}>{checkingOut ? 'Processing...' : 'Checkout'}</Button>
                    </div>
                  </div>
                )}
              </Card>
              <div className="mt-2 flex justify-end">
                <Button onClick={() => setShowCartModal(false)}>Close</Button>
              </div>
            </div>
          </Modal>
        </>
      )}

      <Modal open={showScanner} onClose={() => setShowScanner(false)} title="Scan Barcode">
        <div className="w-full max-w-md">
          <Card>
            <h3 className="mt-0 text-lg font-semibold">Scan Barcode</h3>
            <div className="flex flex-col gap-4">
              <div className="flex-1">
                <div className="flex gap-2 items-center">
                  <Input
                    type="text"
                    placeholder="Type or paste barcode, press Enter"
                    value={manualBarcode}
                    onChange={e => setManualBarcode(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') handleManualAdd() }}
                    className="flex-1"
                    autoFocus
                  />
                  <Button onClick={handleManualAdd} disabled={!subscriptionActive}>Add</Button>
                </div>

                {/* Hidden barcode listener for keyboard scanner devices */}
                {showScanner && scannerMode === 'keyboard' && (
                  <BarcodeScanListener enabled={!!(subscriptionActive && (subscriptionPlan === 'pro' || subscriptionPlan === 'advance') && showScanner)} onScan={(c) => handleBarcodeDetected(c)} endKey="Enter" />
                )}

                <div className="min-h-[20px] mt-2">
                  {scanError && <div className="text-red-600 text-sm">{scanError}</div>}
                  {scanMessage && <div className="text-emerald-800 text-sm">{scanMessage}</div>}
                </div>
              </div>

              <div className="w-full mt-4">
                <Card>
                  <h4 className="m-0 text-sm font-semibold">Cart Preview</h4>
                  {cart.length === 0 ? (
                    <div className="text-gray-500 text-sm mt-2">Cart is empty</div>
                  ) : (
                    <>
                      <div className="mt-2 max-h-[220px] overflow-y-auto pr-2 space-y-2">
                        {cart.map(i => (
                          <div key={i.product.id} className="flex items-center justify-between gap-3 p-2 rounded-md bg-gray-50 border border-gray-100">
                            <div className="flex-1 min-w-0">
                              <div className="font-medium text-sm truncate">{i.product.name}</div>
                              <div className="text-xs text-gray-500">{formatCurrency(i.product.price)} × {i.qty}</div>
                            </div>
                            <div className="flex items-center gap-2">
                              <button className="w-7 h-7 flex items-center justify-center rounded-md border border-gray-200 bg-white" onClick={() => changeQty(i.product.id, Math.max(1, i.qty - 1))}>−</button>
                              <div className="text-sm w-8 text-center">{i.qty}</div>
                              <button className="w-7 h-7 flex items-center justify-center rounded-md border border-gray-200 bg-white" onClick={() => changeQty(i.product.id, Math.min(i.product.stock, i.qty + 1))}>+</button>
                              <button className="ml-2 text-gray-500" title="Remove" onClick={() => removeItem(i.product.id)}>✕</button>
                            </div>
                          </div>
                        ))}
                      </div>

                      <div className="mt-2 flex justify-between items-center">
                        <div className="font-semibold">Total</div>
                        <div className="font-semibold">{formatCurrency(computeTotal())}</div>
                      </div>

                      <div className="mt-2 flex justify-end">
                        <Button onClick={() => { handleCheckout(); setShowScanner(false) }} disabled={!subscriptionActive || checkingOut}>{checkingOut ? 'Processing...' : 'Checkout'}</Button>
                      </div>
                    </>
                  )}
                </Card>
              </div>
            </div>

            <div className="mt-3 flex justify-end gap-2">
              <Button onClick={() => setShowScanner(false)}>Close</Button>
            </div>
          </Card>
        </div>
      </Modal>

      <Modal open={createBarcodeModalOpen} onClose={() => setCreateBarcodeModalOpen(false)} title={pendingBarcodeToCreate ? `Create product for barcode ${pendingBarcodeToCreate}` : 'Create product'}>
        <div className="w-full max-w-md">
          <Card>
            <h3 className="mt-0 text-lg font-semibold">Create product and assign barcode</h3>
            <div className="flex flex-col gap-3 mt-2">
              <div className="text-sm text-gray-600">Barcode: <strong>{pendingBarcodeToCreate}</strong></div>

              <div>
                <label className="block text-sm text-slate-700 mb-1">Name</label>
                <input value={createName} onChange={e => setCreateName(e.target.value)} className="w-full border border-gray-200 rounded-lg px-4 h-11 bg-white" />
                <div className="text-xs text-gray-500">This is the display name shown on receipts and the product list.</div>
              </div>

              <div>
                <label className="block text-sm text-slate-700 mb-1">Price (sell)</label>
                <input value={createPrice} onChange={e => setCreatePrice(e.target.value)} className="w-full border border-gray-200 rounded-lg px-4 h-11 bg-white" type="number" inputMode="decimal" min="0" step="0.01" />
                <div className="text-xs text-gray-500">Enter price in your store currency (decimals allowed).</div>
              </div>

              <div>
                <label className="block text-sm text-slate-700 mb-1">Stock</label>
                <input value={createStock} onChange={e => setCreateStock(e.target.value)} className="w-full border border-gray-200 rounded-lg px-4 h-11 bg-white" type="number" inputMode="numeric" min="0" step="1" />
                <div className="text-xs text-gray-500">Initial quantity available for sale (whole numbers).</div>
              </div>
            </div>

            <div className="mt-3 flex justify-end gap-2">
              <Button onClick={() => setCreateBarcodeModalOpen(false)}>Cancel</Button>
              <Button onClick={async () => {
                setError('')
                setCreateProductErrors('')
                const code = pendingBarcodeToCreate
                if (!code) return

                // Validate form using validation utility
                const validation = validateProductForm({
                  name: createName,
                  price: createPrice,
                  stock: createStock,
                })
                if (!validation.valid) {
                  setCreateProductErrors(validation.errors.map(e => e.message).join('; '))
                  return
                }

                // attempt online create first
                try {
                  const priceNum = Number(createPrice || 0)
                  const stockNum = Math.floor(Number(createStock || 0) || 0)
                  const payload = { name: createName || `Item ${code}`, price: priceNum, stock: stockNum, barcode: String(code) }
                  const _did = await getOrCreateDeviceId()
                  const res = await fetchWithAuth('/api/products', { method: 'POST', headers: { 'content-type': 'application/json', 'x-device-id': _did ?? '' }, body: JSON.stringify({ ...payload, deviceId: _did }) })
                  const json = await res.json()
                  if (!res.ok) throw new Error((json && (json as any).error) || 'Failed')
                  // refresh products list
                  fetchProducts()
                  setCreateBarcodeModalOpen(false)
                } catch (err) {
                  console.error('Create product failed', err)
                  const msg = err instanceof Error ? err.message : String(err)
                  setError(msg || 'Create product failed')
                }
              }}>Create & Assign</Button>
            </div>
            {createProductErrors && <div className="text-red-600 text-sm mt-2">{createProductErrors}</div>}
          </Card>
        </div>
      </Modal>

      <Modal open={showPaymentModal} onClose={() => setShowPaymentModal(false)} title="Payment">
        <div className="w-full max-w-md">
          <Card>
            <h3 className="mt-0 text-lg font-semibold">Payment</h3>
            <div className="mb-2">Total: <strong>{formatCurrency(computeTotal())}</strong></div>
            {/* Show default device for checkout */}
            <div className="mb-2 text-sm text-gray-600">
              Default device: <strong>{settings.defaultDevice ? settings.defaultDevice.charAt(0).toUpperCase() + settings.defaultDevice.slice(1) : 'Not set'}</strong>
            </div>
            <div className="mb-3">
              <div className="text-sm mb-2">Amount paid</div>
              <Input
                type="number"
                inputMode="decimal"
                value={paymentAmount}
                onChange={e => { setPaymentAmount(e.target.value); setPaymentError(null) }}
                className="w-full"
              />
              {paymentError && <div className="text-red-600 text-sm mt-1">{paymentError}</div>}
            </div>
            <div className="mb-3">Change: <strong>{paymentAmount ? formatCurrency(Math.max(0, Number(paymentAmount) - computeTotal())) : formatCurrency(0)}</strong></div>
            <div className="flex gap-2 justify-end">
              <Button onClick={() => { setShowPaymentModal(false); setPaymentError(null) }}>Cancel</Button>
              <Button onClick={async () => {
                try {
                  await performCheckout(Number(paymentAmount || 0))
                  // Do not force a full-page reload; UI is updated via fetchProducts/realtime
                } catch (e) {
                  // performCheckout handles errors; no-op here
                }
              }} disabled={checkingOut}>{checkingOut ? 'Processing...' : 'Confirm & Print'}</Button>
            </div>
          </Card>
        </div>
      </Modal>
      </div>
    </motion.div>
  )
}
