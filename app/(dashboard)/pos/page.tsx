"use client"
import React, { useEffect, useState } from 'react'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import formatCurrency from '@/lib/format/currency'
import supabase from '@/lib/supabase/client'
import ThermalReceipt from '@/components/print/ThermalReceipt'
import ReceiptPreview from '@/components/print/ReceiptPreview'

type Product = { id: string; name: string; price: number; stock: number; barcode?: string }
type CartItem = { product: Product; qty: number }

export default function POSPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [cart, setCart] = useState<CartItem[]>([])
  const [error, setError] = useState<string | null>(null)
  const [checkingOut, setCheckingOut] = useState(false)
  const [receipt, setReceipt] = useState<any | null>(null)
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [paymentAmount, setPaymentAmount] = useState<string>('')
  const [showScanner, setShowScanner] = useState(false)
  const [scanError, setScanError] = useState<string | null>(null)
  const [manualBarcode, setManualBarcode] = useState<string>('')
  const [scanMessage, setScanMessage] = useState<string | null>(null)
  const [scannerDeviceId, setScannerDeviceId] = useState<string | null>(null)
  const [scannerMode, setScannerMode] = useState<'camera' | 'keyboard'>('keyboard')
  const [realtimeMessage, setRealtimeMessage] = useState<string | null>(null)

  useEffect(() => {
    // initial load
    fetchProducts()

    // load scanner settings
    try {
      const raw = localStorage.getItem('pos:settings')
      if (raw) {
        const cfg = JSON.parse(raw || '{}')
        if (cfg.scannerDeviceId) setScannerDeviceId(cfg.scannerDeviceId)
        if (cfg.scannerMode) setScannerMode(cfg.scannerMode)
      }
    } catch (_) {}

    // realtime subscription for product changes — listen to INSERT/UPDATE/DELETE
    const channel = supabase.channel ? supabase.channel('public:products') : null

    const handleChange = (payload: any) => {
      // Supabase payloads commonly include { schema, table, type, record, old_record }
      console.debug('realtime payload:', payload)
      const ev = payload?.type || payload?.eventType || payload?.event || 'change'
      // show a short on-screen indicator so developers can see updates arrive
      try {
        setRealtimeMessage(`${ev} on products`)
        setTimeout(() => setRealtimeMessage(null), 1600)
      } catch (_) {}

      // Refresh product list to reflect server-side changes
      try { fetchProducts() } catch (err) { console.warn('fetchProducts after realtime failed', err) }
    }

    // If the new channel API is available and provides `on`, use it.
    // Otherwise fall back to the `from(...).on(...).subscribe()` compatibility path.
    let fallbackSubs: any[] = []
    if (channel && typeof (channel as any).on === 'function') {
      channel.on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'products' }, handleChange)
      channel.on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'products' }, handleChange)
      channel.on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'products' }, handleChange)

      ;(async () => {
        try {
          console.debug('Attempting to subscribe to realtime channel: public:products')
          const res = await channel.subscribe()
          console.debug('Realtime subscribe result:', res)
          if ((res as any)?.error) console.error('Realtime subscription error:', (res as any).error)
        } catch (err) {
          console.error('Realtime subscribe() thrown error', err)
        }
      })()
    } else {
      // fallback: older/newer client compatibility using from().on().subscribe()
      try {
        console.debug('Realtime channel.on not available; using fallback supabase.from(...) subscriptions')
        const iSub = supabase.from('products').on('INSERT', handleChange).subscribe()
        const uSub = supabase.from('products').on('UPDATE', handleChange).subscribe()
        const dSub = supabase.from('products').on('DELETE', handleChange).subscribe()
        fallbackSubs = [iSub, uSub, dSub]
        console.debug('Fallback subscriptions created', fallbackSubs)
      } catch (err) {
        console.error('Fallback realtime subscribe error', err)
      }
    }

    // diagnostic polling for a short period to show channel object in console
    const inspectTimer = setInterval(() => {
      try { console.debug('realtime channel debug', channel) } catch (_) {}
    }, 2500)

    setTimeout(() => clearInterval(inspectTimer), 15000)

    return () => {
      ;(async () => {
        try {
          if (channel && typeof (channel as any).unsubscribe === 'function') {
            const res = await channel.unsubscribe()
            console.debug('Realtime unsubscribe result:', res)
          } else if (fallbackSubs.length) {
            // unsubscribe each fallback subscription (some clients return {unsubscribe: fn} or a token)
            try {
              for (const s of fallbackSubs) {
                if (!s) continue
                if (typeof s.unsubscribe === 'function') {
                  await s.unsubscribe()
                } else if (typeof supabase.removeSubscription === 'function') {
                  // older supabase-js versions
                  supabase.removeSubscription(s)
                }
              }
            } catch (e) {
              console.warn('fallback unsubscribe error', e)
            }
          }
        } catch (e) {
          console.warn('unsubscribe failed', e)
        }
      })()
    }
  }, [])


  async function fetchProducts() {
    setLoading(true)
    try {
      // Attach current user's access token so server can scope by shop
      const { data } = await supabase.auth.getSession()
      const accessToken = (data as any)?.session?.access_token
      const headers: Record<string,string> = {}
      if (accessToken) headers['Authorization'] = `Bearer ${accessToken}`
      const res = await fetch('/api/products', { headers })
      const json = await res.json()
      if (!res.ok) throw new Error(json?.error || 'Failed to load')
      setProducts(json.data || [])
    } catch (err: any) {
      setError(err?.message || 'Failed to load')
    } finally {
      setLoading(false)
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
    } else {
      console.warn('No product found for barcode:', normalized)
      setScanError(`No product found for barcode: ${normalized}`)
      // also set global error so it shows in the products panel
      setError(`No product found for barcode: ${normalized}`)
    }
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
  }

  async function performCheckout(payment: number) {
    setCheckingOut(true)
    setError(null)
    const items = cart.map(i => ({ product_id: i.product.id, quantity: i.qty, price: i.product.price }))
    const total = computeTotal()
    const change = Number((payment - total).toFixed(2))
    const payload: any = { items, total, payment_method: 'cash', payment, change }
    try {
      // include auth token so backend assigns correct shop and validates ownership
      const { data } = await supabase.auth.getSession()
      const accessToken = (data as any)?.session?.access_token
      const headers: Record<string,string> = { 'content-type': 'application/json' }
      if (accessToken) headers['Authorization'] = `Bearer ${accessToken}`
      const res = await fetch('/api/checkout', { method: 'POST', headers, body: JSON.stringify(payload) })
      const json = await res.json()
      if (!res.ok) throw new Error(json?.error || 'Checkout failed')
      // success: clear cart and refresh products
      setCart([])
      fetchProducts()
      // attach payment and change to receipt for display if backend doesn't include them
      const receiptData = json?.data ?? json
      if (receiptData) {
        // prefer sale object if present
        if (receiptData.sale) {
          receiptData.sale.payment = receiptData.sale.payment ?? payment
          receiptData.sale.change = receiptData.sale.change ?? change
        } else {
          receiptData.payment = receiptData.payment ?? payment
          receiptData.change = receiptData.change ?? change
        }
      }
      setReceipt(receiptData)
      setShowPaymentModal(false)
    } catch (err: any) {
      setError(err?.message || 'Checkout failed')
    } finally {
      setCheckingOut(false)
    }
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
        <div>
          <h2 style={{ margin: 0 }}>Point of Sale</h2>
          <p className="muted">Quickly add products to the cart and checkout</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <Button onClick={() => setShowScanner(true)}>Scan</Button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: 16 }}>
        <div>
          <Card>
            {loading ? (
              <div className="skeleton" style={{ height: 240 }} />
            ) : error ? (
              <div style={{ color: 'red' }}>{error}</div>
            ) : (
              <div className="pos-grid">
                {products.map(p => (
                  <div
                    key={p.id}
                    className={`pos-card ${p.stock <= 0 ? 'disabled' : ''}`}
                    role={p.stock > 0 ? 'button' : undefined}
                    tabIndex={p.stock > 0 ? 0 : -1}
                    onClick={() => { if (p.stock > 0) addToCart(p) }}
                    onKeyDown={(e) => { if (p.stock > 0 && e.key === 'Enter') addToCart(p) }}
                  >
                    <div style={{ fontWeight: 600 }}>{p.name}</div>
                    {p.barcode ? <div style={{ fontSize: 12, color: '#666', marginTop: 4 }}>Barcode: {p.barcode}</div> : null}
                    <div className="price">{formatCurrency(p.price)}</div>
                    <div className="stock">{p.stock > 0 ? `In stock: ${p.stock}` : 'Out of stock'}</div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>

        <div>
          <Card>
            <h3 style={{ marginTop: 0 }}>Cart</h3>
            {cart.length === 0 ? (
              <div className="muted">Cart is empty</div>
            ) : (
              <div>
                {cart.map(i => (
                  <div key={i.product.id} className="cart-item">
                    <div className="meta">
                      <div className="title">{i.product.name}</div>
                      <div className="subtitle">{formatCurrency(i.product.price * i.qty)} ({i.qty}×)</div>
                    </div>

                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      <div className="qty-controls">
                        <button className="qty-btn" aria-label="Decrease quantity" onClick={() => changeQty(i.product.id, Math.max(1, i.qty - 1))}>−</button>
                        <input type="number" value={i.qty} min={1} max={i.product.stock} onChange={e => changeQty(i.product.id, Math.max(1, Number(e.target.value) || 1))} />
                        <button className="qty-btn" aria-label="Increase quantity" onClick={() => changeQty(i.product.id, Math.min(i.product.stock, i.qty + 1))}>+</button>
                      </div>

                      <button className="icon-small" title="Remove" onClick={() => removeItem(i.product.id)} aria-label="Remove item">
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

                <div style={{ marginTop: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ fontWeight: 700 }}>Total</div>
                  <div style={{ fontWeight: 700 }}>{formatCurrency(computeTotal())}</div>
                </div>

                <div style={{ marginTop: 12 }}>
                  <Button onClick={handleCheckout} disabled={checkingOut}>{checkingOut ? 'Processing...' : 'Checkout'}</Button>
                </div>
              </div>
            )}
          </Card>
        </div>
      </div>
      {receipt && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 60 }}>
          <div style={{ width: 360 }}>
            <Card>
              <h3 style={{ marginTop: 0 }}>Receipt</h3>
              {(() => {
                const saleSource = receipt.sale ?? receipt
                const itemsRaw = receipt.items ?? saleSource.items ?? []
                const items = (itemsRaw || []).map((it: any) => ({
                  name: it.name ?? it.product_name ?? it.product_id ?? 'Item',
                  qty: Number(it.quantity ?? it.qty ?? 1),
                  price: Number((it.price ?? it.unit_price ?? 0) || 0),
                }))
                const total = Number(saleSource.total ?? receipt.total ?? 0) || items.reduce((s: number, i: any) => s + i.qty * i.price, 0)
                const saleObj = {
                  id: saleSource.id ?? saleSource.sale_id ?? receipt.sale_id,
                  created_at: saleSource.created_at ?? saleSource.createdAt ?? receipt.created_at,
                  items,
                  total,
                  payment: saleSource.payment ?? receipt.payment,
                  change: saleSource.change ?? receipt.change,
                }

                return (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
                    <div style={{ maxHeight: '60vh', overflow: 'auto', width: '100%', display: 'flex', justifyContent: 'center' }}>
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
              })()}

              <div style={{ marginTop: 12, display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                <Button onClick={() => { setReceipt(null) }}>Close</Button>
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* Scanner modal */}
      {showScanner && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 80 }}>
          <div style={{ width: 420 }}>
            <Card>
              <h3 style={{ marginTop: 0 }}>Scan Barcode</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div style={{ height: 320 }}>
                  <div style={{ padding: 12, borderRadius: 8, background: '#fafafa', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <div style={{ color: '#444', fontSize: 13 }}>Using hardware scanner (keyboard input). Focus the barcode input below and scan — each scan will be typed into the field.</div>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <input
                    type="text"
                    placeholder="Type or paste barcode, press Enter"
                    value={manualBarcode}
                    onChange={e => setManualBarcode(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') handleManualAdd() }}
                    style={{ flex: 1, padding: '8px 10px', borderRadius: 8, border: '1px solid var(--border)' }}
                    autoFocus
                  />
                  <Button onClick={handleManualAdd}>Add</Button>
                </div>

                <div style={{ minHeight: 20 }}>
                  {scanError && <div style={{ color: '#b91c1c', fontSize: 13 }}>{scanError}</div>}
                  {scanMessage && <div style={{ color: '#064e3b', fontSize: 13 }}>{scanMessage}</div>}
                </div>
              </div>
              <div style={{ marginTop: 12, display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                <Button onClick={() => setShowScanner(false)}>Close</Button>
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* Payment modal */}
      {showPaymentModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 70 }}>
          <div style={{ width: 420 }}>
            <Card>
              <h3 style={{ marginTop: 0 }}>Payment</h3>
              <div style={{ marginBottom: 8 }}>Total: <strong>{formatCurrency(computeTotal())}</strong></div>
              <label style={{ display: 'block', marginBottom: 8 }}>
                <div style={{ fontSize: 12, marginBottom: 6 }}>Amount paid</div>
                <input
                  type="number"
                  inputMode="decimal"
                  value={paymentAmount}
                  onChange={e => setPaymentAmount(e.target.value)}
                  style={{ width: '100%', padding: '8px 10px' }}
                />
              </label>
              <div style={{ marginBottom: 12 }}>
                Change: <strong>{paymentAmount ? formatCurrency(Math.max(0, Number(paymentAmount) - computeTotal())) : formatCurrency(0)}</strong>
              </div>

              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                <Button onClick={() => { setShowPaymentModal(false) }}>Cancel</Button>
                <Button onClick={() => performCheckout(Number(paymentAmount || 0))} disabled={checkingOut}>{checkingOut ? 'Processing...' : 'Confirm & Print'}</Button>
              </div>
            </Card>
          </div>
        </div>
      )}
    </div>
  )
}
