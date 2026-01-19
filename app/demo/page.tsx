"use client"
import React, { useState } from 'react'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import formatCurrency from '@/lib/format/currency'

type Product = { id: string; name: string; price: number; stock: number; barcode?: string }
type CartItem = { product: Product; qty: number }

const MOCK_PRODUCTS: Product[] = [
  { id: 'p1', name: 'Mountain Dew', price: 20, stock: 17, barcode: '11' },
  { id: 'p2', name: 'Coke(zero)', price: 20, stock: 14 },
  { id: 'p3', name: 'Sparkle', price: 20, stock: 16 },
  { id: 'p4', name: 'Sprite', price: 20, stock: 16 },
  { id: 'p5', name: 'Royal', price: 20, stock: 17 },
  { id: 'p6', name: 'Coke', price: 20, stock: 15 },
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
  const [search, setSearch] = useState('')

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
    const items = cart.map(i => ({ name: i.product.name, qty: i.qty, price: i.product.price }))
    const total = computeTotal()
    const sale = { id: `demo-${Date.now()}`, created_at: new Date().toISOString(), items, total, payment: total, change: 0 }
    setReceipt(sale)
    setCart([])
  }

  return (
    <div className="min-h-screen bg-[#fafbfa] flex flex-col w-full">
      <header className="flex items-center justify-between px-4 py-3 border-b border-stone-200 bg-white w-full">
        <h1 className="text-2xl font-bold tracking-tight">Demo POS</h1>
        <span className="text-xs text-stone-500">Sample Data Only</span>
      </header>
      <main className="flex-1 flex flex-col lg:flex-row gap-6 md:gap-8 w-full p-4">
        {/* Product List */}
        <div className="flex-1 w-full min-w-0">
          <div className="mb-4 flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full">
            <input
              type="text"
              className="px-4 py-2 rounded-lg border border-stone-200 bg-white text-sm w-full sm:w-64"
              placeholder="Search products by name or barcode"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <div className="bg-white rounded-2xl p-2 sm:p-4 md:p-6 border border-stone-200 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-4 md:gap-6 w-full">
            {products.filter(p => p.name.toLowerCase().includes(search.toLowerCase()) || (p.barcode && p.barcode.includes(search))).map(p => (
              <div
                key={p.id}
                className={
                  `w-full max-w-full sm:max-w-xs md:w-56 min-w-[120px] sm:min-w-[160px] md:min-w-[200px] max-w-[220px] bg-white rounded-xl border border-stone-100 shadow-sm p-3 sm:p-4 md:p-5 flex flex-col gap-2 mx-auto cursor-pointer transition hover:ring-2 hover:ring-emerald-400 ${p.stock <= 0 ? 'opacity-50 pointer-events-none' : ''}`
                }
                onClick={() => p.stock > 0 && addToCart(p)}
                title={p.stock > 0 ? 'Click to add to cart' : 'Out of stock'}
              >
                <div className="font-semibold text-stone-900 text-base sm:text-lg">{p.name}</div>
                {p.barcode && <div className="text-xs text-stone-400 mb-1">Barcode: {p.barcode}</div>}
                <div className="text-lg sm:text-xl font-bold text-stone-900">₱{p.price.toFixed(2)}</div>
                <div className="text-xs text-stone-500">In stock: {p.stock}</div>
                <div className="text-xs text-emerald-700 mt-1">Click to add</div>
              </div>
            ))}
          </div>
        </div>
        {/* Cart */}
        <div className="w-full max-w-full sm:max-w-sm mt-6 md:mt-8 lg:mt-0">
          <div className="bg-white rounded-2xl p-3 sm:p-4 md:p-6 border border-stone-200">
            <h3 className="text-lg font-semibold mb-4">Cart</h3>
            {cart.length === 0 ? (
              <div className="text-sm text-stone-500">Cart is empty</div>
            ) : (
              <div className="space-y-4">
                {cart.map(i => (
                  <div key={i.product.id} className="flex items-center justify-between gap-2">
                    <div>
                      <div className="font-medium text-stone-900">{i.product.name}</div>
                      <div className="text-sm text-stone-500">₱{i.product.price.toFixed(2)} ({i.qty}×)</div>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <button className="w-8 h-8 rounded border border-stone-200 text-lg" onClick={() => setCart(prev => prev.map(it => it.product.id === i.product.id ? { ...it, qty: Math.max(1, it.qty - 1) } : it))}>−</button>
                      <input aria-label="quantity" type="number" value={i.qty} onChange={(e) => {
                        const v = Math.max(1, Math.min(i.product.stock, Number(e.target.value) || 1))
                        setCart(prev => prev.map(it => it.product.id === i.product.id ? { ...it, qty: v } : it))
                      }} className="w-12 text-center border border-stone-200 rounded" />
                      <button className="w-8 h-8 rounded border border-stone-200 text-lg" onClick={() => setCart(prev => prev.map(it => it.product.id === i.product.id ? { ...it, qty: Math.min(i.product.stock, it.qty + 1) } : it))}>+</button>
                      <button className="w-8 h-8 rounded border border-red-200 text-red-600 ml-2" onClick={() => setCart(prev => prev.filter(it => it.product.id !== i.product.id))}>🗑</button>
                    </div>
                  </div>
                ))}
                <div className="flex items-center justify-between font-semibold mt-4">
                  <div>Total</div>
                  <div className="text-lg text-emerald-700 font-bold">₱{computeTotal().toFixed(2)}</div>
                </div>
                <div className="mt-4">
                  <Button className="w-full" onClick={handleCheckout}>Checkout</Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
      {/* Receipt Modal */}
      {receipt && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-2">
          <div className="w-full max-w-lg">
            <Card className="p-6">
              <h3 className="text-xl font-bold mb-4 text-stone-900">Demo Receipt</h3>
              <div>
                <div className="font-semibold mb-2">Sale ID: {String((receipt as Record<string, unknown>)['id'] ?? '')}</div>
                <div className="mb-2 text-sm text-stone-500">{new Date(String((receipt as Record<string, unknown>)['created_at'] ?? '')).toLocaleString()}</div>
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
              <div className="mt-6 flex justify-end">
                <Button variant="secondary" onClick={() => setReceipt(null)}>Close</Button>
              </div>
            </Card>
          </div>
        </div>
      )}
    </div>
  )
}
