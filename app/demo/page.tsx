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
  const [receipt, setReceipt] = useState<Record<string, unknown> | null>(null)

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
    <div className="w-full">
      <div className="container">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-semibold">Demo — Point of Sale</h1>
            <p className="text-sm text-slate-500">Read-only demo with mock data (no database writes)</p>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="secondary" onClick={() => { setCart([]); setReceipt(null) }}>Reset Demo</Button>
            <Button onClick={() => alert('Demo mode — no auth required')}>Try Demo</Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div>
            <Card>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {products.map(p => (
                  <button key={p.id} className={`text-left p-3 rounded-xl border border-gray-100 hover:shadow cursor-pointer ${p.stock <= 0 ? 'opacity-50 cursor-not-allowed' : ''}`} onClick={() => { if (p.stock > 0) addToCart(p) }} disabled={p.stock <= 0}>
                    <div className="font-semibold">{p.name}</div>
                    <div className="text-sm text-slate-600">{formatCurrency(p.price)}</div>
                    <div className="text-xs text-slate-400 mt-2">{p.stock > 0 ? `In stock: ${p.stock}` : 'Out of stock'}</div>
                  </button>
                ))}
              </div>
            </Card>
          </div>

          <div>
            <Card>
              <h3 className="text-lg font-semibold mb-3">Cart</h3>
              {cart.length === 0 ? (
                <div className="text-sm text-slate-500">Cart is empty</div>
              ) : (
                <div className="space-y-3">
                  {cart.map(i => (
                    <div key={i.product.id} className="flex items-center justify-between">
                      <div>
                        <div className="font-medium">{i.product.name}</div>
                        <div className="text-sm text-slate-500">{formatCurrency(i.product.price * i.qty)} ({i.qty}×)</div>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex items-center border rounded-md overflow-hidden">
                          <button className="px-3" onClick={() => setCart(prev => prev.map(it => it.product.id === i.product.id ? { ...it, qty: Math.max(1, it.qty - 1) } : it))}>−</button>
                          <input aria-label="quantity" type="number" value={i.qty} onChange={(e) => {
                            const v = Math.max(1, Math.min(i.product.stock, Number(e.target.value) || 1))
                            setCart(prev => prev.map(it => it.product.id === i.product.id ? { ...it, qty: v } : it))
                          }} className="w-12 text-center border-l border-r" />
                          <button className="px-3" onClick={() => setCart(prev => prev.map(it => it.product.id === i.product.id ? { ...it, qty: Math.min(i.product.stock, it.qty + 1) } : it))}>+</button>
                        </div>
                        <button className="text-sm text-red-600" onClick={() => setCart(prev => prev.filter(it => it.product.id !== i.product.id))}>Remove</button>
                      </div>
                    </div>
                  ))}

                  <div className="flex items-center justify-between font-semibold mt-4">
                    <div>Total</div>
                    <div>{formatCurrency(computeTotal())}</div>
                  </div>

                  <div className="mt-4">
                    <Button className="w-full" onClick={handleCheckout}>Complete (Demo)</Button>
                  </div>
                </div>
              )}
            </Card>

            <Card className="mt-4">
              <h3 className="text-lg font-semibold mb-3">Recent Sales (Demo)</h3>
              <div className="space-y-3">
                {MOCK_SALES.map(s => (
                  <div key={s.id} className="py-2 border-b last:border-b-0">
                    <div className="flex justify-between">
                      <div className="font-medium">{new Date(s.created_at).toLocaleString()}</div>
                      <div className="font-semibold">{formatCurrency(s.total)}</div>
                    </div>
                    <div className="text-sm text-slate-500 mt-1">{s.items.map((it: unknown) => {
                      const row = (typeof it === 'object' && it !== null) ? (it as Record<string, unknown>) : {}
                      return `${(row['name'] as string ?? '')} ×${Number(row['qty'] ?? 0)}`
                    }).join(', ')}</div>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </div>

        {receipt && (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
            <div className="w-full max-w-lg">
              <Card>
                <h3 className="text-lg font-semibold mb-3">Demo Receipt</h3>
                <div>
                  <div className="font-semibold mb-2">Sale ID: {String((receipt as Record<string, unknown>)['id'] ?? '')}</div>
                  <div className="mb-2 text-sm text-slate-500">{new Date(String((receipt as Record<string, unknown>)['created_at'] ?? '')).toLocaleString()}</div>
                  <div className="border-t pt-2">
                    {((((receipt as Record<string, unknown>)['items']) as unknown[]) || []).map((it: unknown, idx: number) => {
                      const row = (typeof it === 'object' && it !== null) ? (it as Record<string, unknown>) : {}
                      const name = (row['name'] as string) ?? ''
                      const qty = Number(row['qty'] ?? 0)
                      const price = Number(row['price'] ?? 0)
                      return (
                        <div key={idx} className="flex justify-between py-1">
                          <div>{name} ×{qty}</div>
                          <div>{formatCurrency(price * qty)}</div>
                        </div>
                      )
                    })}
                  </div>
                    <div className="border-t pt-2 mt-2 flex justify-between font-semibold">
                    <div>Total</div>
                    <div>{formatCurrency(Number((receipt as Record<string, unknown>)['total'] ?? 0))}</div>
                  </div>
                </div>

                <div className="mt-4 flex justify-end">
                  <Button variant="secondary" onClick={() => setReceipt(null)}>Close</Button>
                </div>
              </Card>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
