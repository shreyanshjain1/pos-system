"use client"
import React, { useState } from 'react'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import formatCurrency from '@/lib/format/currency'

type Product = { id: string; name: string; price: number; stock: number; barcode?: string }
type CartItem = { product: Product; qty: number }

const MOCK_PRODUCTS: Product[] = [
  { id: 'p1', name: 'Coffee - Small', price: 2.5, stock: 20 },
  { id: 'p2', name: 'Coffee - Large', price: 3.5, stock: 12 },
  { id: 'p3', name: 'T-Shirt', price: 15.0, stock: 5 },
  { id: 'p4', name: 'Sticker', price: 1.0, stock: 50 },
]

const MOCK_SALES = [
  { id: 's-demo-1', created_at: new Date(Date.now() - 1000 * 60 * 60).toISOString(), items: [{ name: 'Coffee - Small', qty: 2, price: 2.5 }], total: 5.0 },
  { id: 's-demo-2', created_at: new Date(Date.now() - 1000 * 60 * 60 * 6).toISOString(), items: [{ name: 'T-Shirt', qty: 1, price: 15.0 }], total: 15.0 },
  { id: 's-demo-3', created_at: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(), items: [{ name: 'Sticker', qty: 4, price: 1.0 }], total: 4.0 },
]
export default function DemoPOS() {
  const [products] = useState<Product[]>(MOCK_PRODUCTS)
  const [cart, setCart] = useState<CartItem[]>([])
  const [receipt, setReceipt] = useState<any | null>(null)

  function addToCart(p: Product) {
    setCart(prev => {
      const found = prev.find(i => i.product.id === p.id)
      if (found) return prev.map(i => i.product.id === p.id ? { ...i, qty: Math.min(i.qty + 1, p.stock) } : i)
      return [...prev, { product: p, qty: 1 }]
    })
  }

  function computeTotal() {
    return cart.reduce((s, i) => s + i.product.price * i.qty, 0)
  }

  function handleCheckout() {
    if (cart.length === 0) return
    // Demo: simulate a receipt locally, no backend writes
    const items = cart.map(i => ({ name: i.product.name, qty: i.qty, price: i.product.price }))
    const total = computeTotal()
    const sale = { id: `demo-${Date.now()}`, created_at: new Date().toISOString(), items, total, payment: total, change: 0 }
    setReceipt(sale)
    setCart([])
  }

  return (
    <div className="main-content">
      <div className="container">
        <div className="topbar" style={{ marginBottom: 12 }}>
          <div className="left">
            <div className="title-block">
              <h1 style={{ margin: 0 }}>Demo — Point of Sale</h1>
              <p className="muted" style={{ margin: 0 }}>Read-only demo with mock data (no database writes)</p>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn secondary" onClick={() => { setCart([]); setReceipt(null) }}>Reset Demo</button>
            <button className="btn" onClick={() => alert('Demo mode — no auth required')}>Try Demo</button>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 420px', gap: 20 }}>
          <div>
            <div className="card">
              <div className="pos-grid">
                {products.map(p => (
                  <div key={p.id} className={`pos-card ${p.stock <= 0 ? 'disabled' : ''}`} role={p.stock > 0 ? 'button' : undefined} tabIndex={p.stock > 0 ? 0 : -1} onClick={() => { if (p.stock > 0) addToCart(p) }}>
                    <div style={{ fontWeight: 700, fontSize: 15 }}>{p.name}</div>
                    <div className="price">{formatCurrency(p.price)}</div>
                    <div className="stock">{p.stock > 0 ? `In stock: ${p.stock}` : 'Out of stock'}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div>
            <div className="card">
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
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        <div className="qty-controls">
                          <button className="qty-btn" onClick={() => setCart(prev => prev.map(it => it.product.id === i.product.id ? { ...it, qty: Math.max(1, it.qty - 1) } : it))}>−</button>
                          <input aria-label="quantity" type="number" value={i.qty} onChange={(e) => {
                            const v = Math.max(1, Math.min(i.product.stock, Number(e.target.value) || 1))
                            setCart(prev => prev.map(it => it.product.id === i.product.id ? { ...it, qty: v } : it))
                          }} />
                          <button className="qty-btn" onClick={() => setCart(prev => prev.map(it => it.product.id === i.product.id ? { ...it, qty: Math.min(i.product.stock, it.qty + 1) } : it))}>+</button>
                        </div>
                        <div style={{ display: 'flex', gap: 8 }}>
                          <button className="icon-small" onClick={() => setCart(prev => prev.filter(it => it.product.id !== i.product.id))}>Remove</button>
                        </div>
                      </div>
                    </div>
                  ))}

                  <div className="cart-footer">
                    <div style={{ fontWeight: 700 }}>Total</div>
                    <div style={{ fontWeight: 700 }}>{formatCurrency(computeTotal())}</div>
                  </div>

                  <div style={{ marginTop: 12 }}>
                    <button className="btn full" onClick={handleCheckout}>Complete (Demo)</button>
                  </div>
                </div>
              )}
            </div>

            <div style={{ marginTop: 16 }} className="card">
              <h3 style={{ marginTop: 0 }}>Recent Sales (Demo)</h3>
              {MOCK_SALES.map(s => (
                <div key={s.id} style={{ padding: '8px 0', borderBottom: '1px solid #f1f1f1' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <div style={{ fontWeight: 600 }}>{new Date(s.created_at).toLocaleString()}</div>
                    <div style={{ fontWeight: 700 }}>{formatCurrency(s.total)}</div>
                  </div>
                  <div style={{ fontSize: 13, color: '#666', marginTop: 6 }}>
                    {s.items.map((it: any) => `${it.name} ×${it.qty}`).join(', ')}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {receipt && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 60 }}>
            <div style={{ width: 480 }}>
              <div className="card">
                <h3 style={{ marginTop: 0 }}>Demo Receipt</h3>
                <div>
                  <div style={{ fontWeight: 700, marginBottom: 8 }}>Sale ID: {receipt.id}</div>
                  <div style={{ marginBottom: 8 }}>{new Date(receipt.created_at).toLocaleString()}</div>
                  <div style={{ borderTop: '1px solid #eee', paddingTop: 8 }}>
                    {receipt.items.map((it: any, idx: number) => (
                      <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                        <div>{it.name} ×{it.qty}</div>
                        <div>{formatCurrency(it.price * it.qty)}</div>
                      </div>
                    ))}
                  </div>
                  <div style={{ borderTop: '1px solid #eee', paddingTop: 8, marginTop: 8, display: 'flex', justifyContent: 'space-between' }}>
                    <div style={{ fontWeight: 700 }}>Total</div>
                    <div style={{ fontWeight: 700 }}>{formatCurrency(receipt.total)}</div>
                  </div>
                </div>

                <div style={{ marginTop: 12, display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                  <button className="btn secondary" onClick={() => setReceipt(null)}>Close</button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
