"use client"
import React, { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Modal from '@/components/ui/Modal'
import Input from '@/components/ui/Input'
import formatCurrency from '@/lib/format/currency'
import supabase from '@/lib/supabase/client'
import fetchWithAuth from '@/lib/fetchWithAuth'
import { lookupBarcodeCached, cacheBarcode, cacheProduct, addOutboxItem } from '@/lib/offlineQueue'
import { getOrCreateDeviceId } from '@/lib/devices'
import BarcodeScanListener from '@/components/scan/BarcodeScanListener'
import ThermalReceipt from '@/components/print/ThermalReceipt'
import ReceiptPreview from '@/components/print/ReceiptPreview'
import { useRef } from 'react'

type Product = { id: string; name: string; price: number; stock: number; barcode?: string }
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
  const pollTimerRef = useRef<number | null>(null)
  const inspectTimerRef = useRef<number | null>(null)
  const pendingRealtimeRef = useRef<Record<string, unknown>[]>([])
  const realtimeDebounceRef = useRef<number | null>(null)
  const [isMobile, setIsMobile] = useState(false)
  const [showCartModal, setShowCartModal] = useState(false)

  useEffect(() => {
    // initial load
    fetchProducts()

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
    window.addEventListener('pos:settings:updated', onSettingsUpdate)

    // Realtime disabled temporarily to avoid overloading hosting (Vercel).
    // Products will be fetched on load and after checkouts; re-enable realtime when ready.
    setRealtimeStatus('idle')

    return () => {
      try { if (inspectTimerRef.current) window.clearInterval(inspectTimerRef.current) } catch (_) {}
      try { if (pollTimerRef.current) window.clearInterval(pollTimerRef.current) } catch (_) {}
      try { window.removeEventListener('pos:settings:updated', () => {}) } catch (_) {}
      try { window.removeEventListener('resize', checkMobile) } catch (_) {}
    }
  }, [])

  // Device-ID based enforcement removed: allow all devices to create/checkout

  // Offline sync removed: no background queue or periodic sync


  async function fetchProducts(opts?: { skipLoading?: boolean }) {
    const skipLoading = opts?.skipLoading === true
    if (!skipLoading) setLoading(true)
    try {
      // Attach current user's access token so server can scope by shop
      const res = await fetchWithAuth('/api/products')
      const json: unknown = await res.json()
      if (!res.ok) {
        const errMsg = typeof json === 'object' && json !== null ? (json as Record<string, unknown>)['error'] : undefined
        throw new Error((errMsg as string) || 'Failed to load')
      }
      const obj = typeof json === 'object' && json !== null ? (json as Record<string, unknown>) : {}
      setProducts((obj['data'] ?? []) as Product[])
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      if (!skipLoading) setError(msg || 'Failed to load')
    } finally {
      if (!skipLoading) setLoading(false)
    }
  }

  function addToCart(p: Product) {
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
    // try cached lookup first
    (async () => {
      try {
        const cached = await lookupBarcodeCached(normalized)
        if (cached) {
          addToCart(cached)
          setError(null)
          setScanError(null)
          setScanMessage(`${cached.name} added`)
          setManualBarcode('')
          setTimeout(() => setScanMessage(null), 1400)
          return
        }
      } catch (e) { console.debug('cache lookup error', e) }

      const prod = products.find(p => p.barcode && String(p.barcode).trim() === normalized)
      if (prod) {
      console.debug('Matched product:', prod.id, prod.name)
      addToCart(prod)
      setError(null)
      setScanError(null)
      setScanMessage(`${prod.name} added`)
      setManualBarcode('')
      // clear success message after a short delay
      setTimeout(() => setScanMessage(null), 1400)
        return
    } else {
      console.warn('No product found for barcode:', normalized)
        setScanError(`No product found for barcode: ${normalized}`)
        setError(`No product found for barcode: ${normalized}`)
        // If this device is authoritative, open modal to create or assign
        // Open create modal for any device when barcode not found
        setPendingBarcodeToCreate(normalized)
        setCreateName('')
        setCreatePrice('0')
        setCreateStock('0')
        setCreateBarcodeModalOpen(true)
    }
    })()
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
    setError(null)
    const items = cart.map(i => ({ product_id: i.product.id, quantity: i.qty, price: i.product.price }))
    const total = computeTotal()
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
      // success: clear cart and refresh products
      setCart([])
      fetchProducts()
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
    } catch (err: unknown) {
      // Offline feature temporarily removed — surface error to user
      const msg = err instanceof Error ? err.message : String(err)
      setError(msg || 'Checkout failed')
    } finally {
      setCheckingOut(false)
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
      <div className="max-w-7xl mx-auto">
      {/* Realtime diagnostics */}
      <div className="flex justify-end mb-2">
        <div className="text-sm text-gray-600">
          Realtime: <strong className={`${realtimeStatus === 'connected' ? 'text-emerald-600' : realtimeStatus === 'polling' ? 'text-amber-600' : realtimeStatus === 'error' ? 'text-red-600' : 'text-gray-700'}`}>{realtimeStatus}</strong>
          {lastRealtimeAt ? <span className="ml-2">Last: {new Date(lastRealtimeAt).toLocaleTimeString()}</span> : null}
        </div>
      </div>

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
          <Button onClick={() => setShowScanner(true)} className="ml-2">Scan</Button>
        </div>
      </div>
      

      <div className="grid gap-6 grid-cols-1 md:grid-cols-[1fr_380px]">
        <div>
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

                <div className="grid gap-4 grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                {products.map(p => (
                  <motion.div
                    key={p.id}
                    whileHover={{ scale: p.stock > 0 ? 1.02 : 1 }}
                    transition={{ type: 'spring', stiffness: 260, damping: 20 }}
                    role={p.stock > 0 ? 'button' : undefined}
                    tabIndex={p.stock > 0 ? 0 : -1}
                    onClick={() => { if (p.stock > 0) addToCart(p) }}
                    onKeyDown={(e) => { if (p.stock > 0 && e.key === 'Enter') addToCart(p) }}
                    className={`group bg-white rounded-xl border border-gray-100 p-4 cursor-pointer shadow-sm hover:shadow-lg transform transition-all duration-200 ${p.stock <= 0 ? 'opacity-60 cursor-not-allowed grayscale' : ''}`}
                  >
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
        </div>

        {!isMobile && (
          <div>
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
          </div>
        )}
      </div>
      <Modal open={!!receipt} onClose={() => setReceipt(null)} title="Receipt">
        <div className="w-full max-w-md">
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
              <Button onClick={() => { setReceipt(null) }}>Close</Button>
            </div>
          </Card>
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
            <div className="flex flex-col gap-2">
              <div className="h-[320px]">
                <div className="p-3 rounded-md bg-gray-50 h-full flex items-center justify-center">
                  <div className="text-gray-700 text-sm">Using hardware scanner (keyboard input). Focus the barcode input below and scan — each scan will be typed into the field.</div>
                </div>
              </div>

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
                <Button onClick={handleManualAdd}>Add</Button>
              </div>

              {/* Hidden barcode listener for keyboard scanner devices */}
              {showScanner && scannerMode === 'keyboard' && (
                <BarcodeScanListener enabled={showScanner} onScan={(c) => handleBarcodeDetected(c)} endKey="Enter" />
              )}

              <div className="min-h-[20px]">
                {scanError && <div className="text-red-600 text-sm">{scanError}</div>}
                {scanMessage && <div className="text-emerald-800 text-sm">{scanMessage}</div>}
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
            <div className="flex flex-col gap-2 mt-2">
              <div className="text-sm text-gray-600">Barcode: <strong>{pendingBarcodeToCreate}</strong></div>
              <Input placeholder="Product name" value={createName} onChange={e => setCreateName(e.target.value)} />
              <Input placeholder="Price" type="number" value={createPrice} onChange={e => setCreatePrice(e.target.value)} />
              <Input placeholder="Stock" type="number" value={createStock} onChange={e => setCreateStock(e.target.value)} />
            </div>

            <div className="mt-3 flex justify-end gap-2">
              <Button onClick={() => setCreateBarcodeModalOpen(false)}>Cancel</Button>
              <Button onClick={async () => {
                const code = pendingBarcodeToCreate
                if (!code) return
                // attempt online create first
                try {
                  const payload = { code, name: createName || `Item ${code}`, price: Number(createPrice || 0), stock: Number(createStock || 0) }
                  const _did = await getOrCreateDeviceId()
                  const res = await fetchWithAuth('/api/products/create-with-barcode', { method: 'POST', headers: { 'content-type': 'application/json', 'x-device-id': _did ?? '' }, body: JSON.stringify({ ...payload, device_id: _did }) })
                  const json = await res.json()
                  if (!res.ok) throw new Error((json && (json as any).error) || 'Failed')
                  // cache product and barcode
                  try { await cacheProduct((json as any).product); await cacheBarcode(code, (json as any).product) } catch (_) {}
                  // add to products list locally
                  fetchProducts()
                  setCreateBarcodeModalOpen(false)
                } catch (err) {
                  // offline: queue create product + barcode assignment
                    try {
                    const tempId = (globalThis.crypto as any)?.randomUUID?.() ?? Math.random().toString(36).slice(2)
                    const productPayload = { id: tempId, name: createName || `Item ${code}`, price: Number(createPrice || 0), stock: Number(createStock || 0) }
                    await cacheProduct(productPayload)
                    await cacheBarcode(code, productPayload)
                    // outbox: create product then assign barcode
                      try {
                      const deviceId = (await getOrCreateDeviceId()) ?? undefined
                      await addOutboxItem('create_product', { product: productPayload }, { deviceId })
                      await addOutboxItem('assign_barcode', { code, product_id: tempId }, { deviceId })
                    } catch (e) {
                      // fallback: queue without deviceId
                      await addOutboxItem('create_product', { product: productPayload })
                      await addOutboxItem('assign_barcode', { code, product_id: tempId })
                    }
                    // update UI
                    setCreateBarcodeModalOpen(false)
                    fetchProducts()
                  } catch (e) {
                    console.error('Failed to queue product creation', e)
                    setError('Failed to queue product creation')
                  }
                }
              }}>Create & Assign</Button>
            </div>
          </Card>
        </div>
      </Modal>

      <Modal open={showPaymentModal} onClose={() => setShowPaymentModal(false)} title="Payment">
        <div className="w-full max-w-md">
          <Card>
            <h3 className="mt-0 text-lg font-semibold">Payment</h3>
            <div className="mb-2">Total: <strong>{formatCurrency(computeTotal())}</strong></div>

            <div className="mb-3">
              <div className="text-sm mb-2">Amount paid</div>
              <Input
                type="number"
                inputMode="decimal"
                value={paymentAmount}
                onChange={e => setPaymentAmount(e.target.value)}
                className="w-full"
              />
            </div>

            <div className="mb-3">Change: <strong>{paymentAmount ? formatCurrency(Math.max(0, Number(paymentAmount) - computeTotal())) : formatCurrency(0)}</strong></div>

            <div className="flex gap-2 justify-end">
              <Button onClick={() => { setShowPaymentModal(false) }}>Cancel</Button>
              <Button onClick={() => performCheckout(Number(paymentAmount || 0))} disabled={checkingOut}>{checkingOut ? 'Processing...' : 'Confirm & Print'}</Button>
            </div>
          </Card>
        </div>
      </Modal>
      </div>
    </motion.div>
  )
}
