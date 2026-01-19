"use client"
import React, { useEffect, useState } from 'react'
import fetchWithAuth from '@/lib/fetchWithAuth'
import { motion } from 'framer-motion'
import { pageVariants, cardVariants } from '@/lib/motion'
import Link from 'next/link'
import PaymentModal from '@/components/ui/PaymentModal'

export default function SupplyPage() {
  const [plan, setPlan] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [products, setProducts] = useState<Array<any>>([])
  const [selectedItems, setSelectedItems] = useState<Map<string, number>>(new Map())
  const [loadingProducts, setLoadingProducts] = useState(true)
  const [restocking, setRestocking] = useState(false)
  const [paymentModal, setPaymentModal] = useState<{ isOpen: boolean; amount: string }>({
    isOpen: false,
    amount: ''
  })
  const [groceryList, setGroceryList] = useState<{ isOpen: boolean; lines: string[] }>({
    isOpen: false,
    lines: [],
  })

  useEffect(() => {
    ;(async () => {
      try {
        const res = await fetchWithAuth('/api/subscription')
        if (res.ok) {
          const sj = await res.json().catch(() => ({}))
          const planRaw = (sj?.plan ?? null)
          const planNorm = planRaw ? String(planRaw).toLowerCase() : null
          setPlan(planNorm === 'advanced' ? 'advance' : planNorm)
        } else {
          setPlan('basic')
        }
      } catch (_) {
        setPlan('basic')
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  const planIsBasic = plan === 'basic'

  const fetchProducts = async () => {
    setLoadingProducts(true)
    try {
      const resp = await fetchWithAuth('/api/products')
      if (resp.ok) {
        const payload = await resp.json()
        const data = payload?.data ?? []
        setProducts(Array.isArray(data) ? data : [])
      }
    } catch (e) {
      console.error('Failed to load products', e)
    } finally {
      setLoadingProducts(false)
    }
  }

  useEffect(() => {
    if (plan && !planIsBasic) {
      fetchProducts()
    }
  }, [plan, planIsBasic])

  const handleQuantityChange = (productId: string, quantity: number) => {
    const newSelected = new Map(selectedItems)
    if (quantity > 0) {
      newSelected.set(productId, quantity)
    } else {
      newSelected.delete(productId)
    }
    setSelectedItems(newSelected)
  }

  const handleMaxClick = (product: any) => {
    const currentStock = Number(product.stock ?? 0)
    const maxStock = Number(product.max_stock ?? 0)
    const needed = Math.max(0, maxStock - currentStock)
    if (needed > 0) {
      handleQuantityChange(product.id, needed)
    }
  }

  const handleRestockAll = () => {
    const newSelected = new Map<string, number>()
    products.forEach(product => {
      const currentStock = Number(product.stock ?? 0)
      const maxStock = Number(product.max_stock ?? 0)
      const needed = Math.max(0, maxStock - currentStock)
      if (needed > 0) {
        newSelected.set(product.id, needed)
      }
    })
    setSelectedItems(newSelected)
  }

  const handlePurchase = async () => {
    if (selectedItems.size === 0) return
    
    setRestocking(true)
    try {
      const updates = Array.from(selectedItems.entries()).map(([id, qty]) => ({
        id,
        quantity: qty
      }))

      for (const { id, quantity } of updates) {
        const product = products.find(p => p.id === id)
        if (!product) continue

        const currentStock = Number(product.stock ?? 0)
        const newStock = currentStock + quantity

        const response = await fetchWithAuth(`/api/products/${id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: product.name,
            price: Number(product.price ?? 0),
            stock: newStock,
            barcode: product.barcode || null,
            cost: Number(product.cost ?? 0),
            min_stock: Number(product.min_stock ?? 0),
            max_stock: Number(product.max_stock ?? null),
            sku: product.sku || null,
            images: product.images || []
          })
        })

        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.error || 'Update failed')
        }
      }

      await fetchProducts()
      setSelectedItems(new Map())
      alert('Stock updated successfully!')
    } catch (e) {
      console.error('Failed to update stock', e)
      alert(`Failed to update stock: ${e instanceof Error ? e.message : 'Please try again.'}`)
    } finally {
      setRestocking(false)
    }
  }

  const handleBuyForMe = async () => {
    if (selectedItems.size === 0) return
    
    setRestocking(true)
    try {
      const orders = Array.from(selectedItems.entries()).map(([productId, quantity]) => {
        const product = products.find(p => p.id === productId)
        return {
          product_id: productId,
          product_name: product?.name || 'Unknown',
          quantity,
          cost: Number(product?.cost ?? 0)
        }
      })

      const response = await fetchWithAuth('/api/supply-orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orders,
          serviceFee,
          deliveryFee
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Order failed')
      }

      setSelectedItems(new Map())
      // Show payment modal instead of alert
      setPaymentModal({ isOpen: true, amount: `₱${grandTotal.toFixed(2)}` })
    } catch (e) {
      console.error('Failed to place order', e)
      alert(`Failed to place order: ${e instanceof Error ? e.message : 'Please try again.'}`)
    } finally {
      setRestocking(false)
    }
  }

  const totalItems = selectedItems.size
  const totalQuantity = Array.from(selectedItems.values()).reduce((sum, qty) => sum + qty, 0)
  
  // Calculate total cost
  const totalCost = Array.from(selectedItems.entries()).reduce((sum, [id, qty]) => {
    const product = products.find(p => p.id === id)
    const cost = Number(product?.cost ?? 0)
    return sum + (cost * qty)
  }, 0)
  
  const serviceFee = totalCost * 0.05 // 5% service fee
  
  // Delivery fee: ₱500 minimum, increases by ₱50 for every 10 units above 10
  const baseDeliveryFee = 500
  const deliveryFee = totalQuantity > 0 ? Math.max(baseDeliveryFee, baseDeliveryFee + Math.floor(Math.max(0, totalQuantity - 10) / 10) * 50) : 0
  
  const grandTotal = totalCost + serviceFee + deliveryFee

  const handleGenerateGroceryList = () => {
    const lines: string[] = []
    products.forEach(product => {
      const currentStock = Number(product.stock ?? 0)
      const targetStock = Number(product.max_stock ?? 0) > 0 ? Number(product.max_stock) : 10
      const needed = Math.max(0, targetStock - currentStock)
      if (needed > 0) {
        lines.push(`${product.name} - ${needed} units`)
      }
    })
    setGroceryList({ isOpen: true, lines })
  }

  const handleCopyGroceryList = () => {
    const text = groceryList.lines.join('\n') || 'All items are at or above their target stock.'
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).catch(() => {
        const textarea = document.createElement('textarea')
        textarea.value = text
        document.body.appendChild(textarea)
        textarea.select()
        document.execCommand('copy')
        document.body.removeChild(textarea)
      })
    } else {
      const textarea = document.createElement('textarea')
      textarea.value = text
      document.body.appendChild(textarea)
      textarea.select()
      document.execCommand('copy')
      document.body.removeChild(textarea)
    }
  }

  const handleDownloadGroceryPdf = () => {
    const lines = groceryList.lines
    const content = lines.length > 0 ? lines.map((l, idx) => `${idx + 1}. ${l}`).join('<br/>') : 'All items are at or above their target stock.'
    const win = window.open('', '_blank', 'width=800,height=900')
    if (!win) return
    win.document.write(`<!DOCTYPE html><html><head><title>Grocery List</title></head><body><h2>Grocery List</h2><div style="font-family: Arial, sans-serif; font-size: 14px;">${content}</div></body></html>`)
    win.document.close()
    win.focus()
    win.print()
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
      </div>
    )
  }

  if (planIsBasic) {
    return (
      <motion.div
        className="max-w-4xl mx-auto"
        variants={pageVariants}
        initial="hidden"
        animate="visible"
      >
        <motion.div
          className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-2xl p-12 border-2 border-amber-200 shadow-lg text-center"
          variants={cardVariants}
        >
          <div className="w-16 h-16 bg-gradient-to-br from-amber-400 to-orange-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-md">
            <svg className="w-8 h-8 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <h2 className="text-3xl font-bold text-stone-900 mb-4">Supply Management</h2>
          <p className="text-lg text-stone-700 mb-8 max-w-2xl mx-auto">
            Supply management is available on <span className="font-semibold text-emerald-700">Pro</span> and <span className="font-semibold text-emerald-700">Advanced</span> plans. 
            Upgrade to track suppliers, manage purchase orders, and streamline your inventory supply chain.
          </p>
          <div className="flex gap-4 justify-center">
            <Link 
              href="/plans"
              className="px-8 py-3 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white font-semibold rounded-xl shadow-md hover:shadow-lg hover:from-emerald-600 hover:to-emerald-700 transition-all"
            >
              View Plans
            </Link>
            <Link 
              href="/dashboard"
              className="px-8 py-3 bg-white text-stone-700 font-semibold rounded-xl shadow-sm hover:shadow-md border border-stone-200 transition-all"
            >
              Back to Dashboard
            </Link>
          </div>
        </motion.div>
      </motion.div>
    )
  }

  return (
    <motion.div
      className="max-w-7xl mx-auto"
      variants={pageVariants}
      initial="hidden"
      animate="visible"
    >
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-stone-900 tracking-tight">Supply Management</h2>
          <p className="text-base text-stone-600 mt-2">Select items to restock and specify quantities</p>
        </div>
        <div className="flex gap-3 flex-wrap justify-end">
          <button
            onClick={handleGenerateGroceryList}
            disabled={loadingProducts}
            className="px-5 py-2.5 bg-white text-emerald-700 font-semibold rounded-xl border border-emerald-200 shadow-sm hover:shadow-md transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Grocery List
          </button>
          <button
            onClick={handleRestockAll}
            disabled={loadingProducts}
            className="px-6 py-2.5 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white font-semibold rounded-xl shadow-md hover:shadow-lg hover:from-emerald-600 hover:to-emerald-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Restock All to Max
          </button>
        </div>
      </div>

      {loadingProducts ? (
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
        </div>
      ) : (
        <>
          {/* Mobile cards */}
          <div className="space-y-4 lg:hidden">
            {products.map(product => {
              const currentStock = Number(product.stock ?? 0)
              const maxStock = Number(product.max_stock ?? 0)
              const targetStock = maxStock > 0 ? maxStock : 10
              const needed = Math.max(0, targetStock - currentStock)
              const orderQty = selectedItems.get(product.id) ?? 0
              const cost = Number(product.cost ?? 0)
              const subtotal = cost * orderQty
              return (
                <div key={product.id} className="bg-white rounded-2xl border border-stone-200 shadow-sm p-4 space-y-3">
                  <div className="flex justify-between items-start gap-2">
                    <div>
                      <div className="font-semibold text-stone-900">{product.name}</div>
                      {product.sku && <div className="text-xs text-stone-500">{product.sku}</div>}
                    </div>
                    <span className="text-sm font-medium text-stone-700">₱{cost.toFixed(2)}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-sm text-stone-700">
                    <div className="bg-stone-50 rounded-lg px-3 py-2">
                      <div className="text-xs text-stone-500">Current</div>
                      <div className="font-semibold">{currentStock}</div>
                    </div>
                    <div className="bg-stone-50 rounded-lg px-3 py-2">
                      <div className="text-xs text-stone-500">Max / Target</div>
                      <div className="font-semibold">{maxStock || '10 (default)'}</div>
                    </div>
                    <div className="bg-stone-50 rounded-lg px-3 py-2 col-span-2">
                      <div className="text-xs text-stone-500">Needed</div>
                      <div className={`font-semibold ${needed > 0 ? 'text-amber-600' : 'text-emerald-600'}`}>{needed > 0 ? needed : 'Full'}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <input
                      type="number"
                      min="0"
                      value={orderQty}
                      onChange={(e) => handleQuantityChange(product.id, parseInt(e.target.value) || 0)}
                      className="flex-1 px-3 py-2 text-sm border border-stone-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                      placeholder="0"
                    />
                    <button
                      onClick={() => handleMaxClick(product)}
                      disabled={needed === 0}
                      className="px-4 py-2 text-sm font-semibold text-emerald-700 bg-emerald-50 rounded-lg hover:bg-emerald-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Max
                    </button>
                  </div>
                  <div className="text-sm font-medium text-stone-900">{orderQty > 0 ? `Subtotal: ₱${subtotal.toFixed(2)}` : 'Subtotal: —'}</div>
                </div>
              )
            })}
          </div>

          {/* Desktop table */}
          <motion.div 
            className="hidden lg:block bg-white rounded-2xl border border-stone-200 shadow-sm overflow-hidden mb-6"
            variants={cardVariants}
          >
            <div className="overflow-x-auto -mx-4 sm:mx-0">
              <table className="w-full min-w-[680px] sm:min-w-[760px]">
                <thead className="bg-stone-50 border-b border-stone-200">
                  <tr>
                    <th className="px-3 sm:px-6 py-3 sm:py-4 text-left text-xs font-semibold text-stone-700 uppercase tracking-wider">Product</th>
                    <th className="px-3 sm:px-6 py-3 sm:py-4 text-left text-xs font-semibold text-stone-700 uppercase tracking-wider">Cost</th>
                    <th className="px-3 sm:px-6 py-3 sm:py-4 text-left text-xs font-semibold text-stone-700 uppercase tracking-wider hidden lg:table-cell">Current Stock</th>
                    <th className="px-3 sm:px-6 py-3 sm:py-4 text-left text-xs font-semibold text-stone-700 uppercase tracking-wider hidden lg:table-cell">Max Stock</th>
                    <th className="px-3 sm:px-6 py-3 sm:py-4 text-left text-xs font-semibold text-stone-700 uppercase tracking-wider">Needed</th>
                    <th className="px-3 sm:px-6 py-3 sm:py-4 text-left text-xs font-semibold text-stone-700 uppercase tracking-wider">Order Qty</th>
                    <th className="px-3 sm:px-6 py-3 sm:py-4 text-left text-xs font-semibold text-stone-700 uppercase tracking-wider hidden sm:table-cell">Subtotal</th>
                    <th className="px-3 sm:px-6 py-3 sm:py-4 text-left text-xs font-semibold text-stone-700 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-200">
                  {products.map((product) => {
                    const currentStock = Number(product.stock ?? 0)
                    const maxStock = Number(product.max_stock ?? 0)
                    const needed = Math.max(0, maxStock - currentStock)
                    const orderQty = selectedItems.get(product.id) ?? 0
                    const cost = Number(product.cost ?? 0)
                    const subtotal = cost * orderQty

                    return (
                      <tr key={product.id} className="hover:bg-stone-50 transition-colors">
                        <td className="px-3 sm:px-6 py-3 sm:py-4">
                          <div className="font-medium text-stone-900 text-sm">{product.name}</div>
                          {product.sku && <div className="text-xs text-stone-500">{product.sku}</div>}
                        </td>
                        <td className="px-3 sm:px-6 py-3 sm:py-4 text-stone-700 text-sm">₱{cost.toFixed(2)}</td>
                        <td className="px-3 sm:px-6 py-3 sm:py-4 text-stone-700 text-sm hidden lg:table-cell">{currentStock}</td>
                        <td className="px-3 sm:px-6 py-3 sm:py-4 text-stone-700 text-sm hidden lg:table-cell">{maxStock || '—'}</td>
                        <td className="px-3 sm:px-6 py-3 sm:py-4">
                          <span className={`font-medium text-sm ${needed > 0 ? 'text-amber-600' : 'text-emerald-600'}`}>
                            {needed > 0 ? needed : 'Full'}
                          </span>
                        </td>
                        <td className="px-3 sm:px-6 py-3 sm:py-4">
                          <input
                            type="number"
                            min="0"
                            value={orderQty}
                            onChange={(e) => handleQuantityChange(product.id, parseInt(e.target.value) || 0)}
                            className="w-20 sm:w-24 px-2 sm:px-3 py-1.5 sm:py-2 text-sm border border-stone-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                            placeholder="0"
                          />
                        </td>
                        <td className="px-3 sm:px-6 py-3 sm:py-4 hidden sm:table-cell">
                          <span className="font-medium text-stone-900 text-sm">
                            {orderQty > 0 ? `₱${subtotal.toFixed(2)}` : '—'}
                          </span>
                        </td>
                        <td className="px-3 sm:px-6 py-3 sm:py-4">
                          <button
                            onClick={() => handleMaxClick(product)}
                            disabled={needed === 0}
                            className="px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-medium text-emerald-700 bg-emerald-50 rounded-lg hover:bg-emerald-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            Max
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </motion.div>

          <motion.div
            className="bg-gradient-to-r from-emerald-50 to-emerald-100 rounded-xl sm:rounded-2xl border border-emerald-200 p-4 sm:p-6"
            variants={cardVariants}
          >
            <div className="flex flex-col lg:flex-row items-start justify-between gap-4 lg:gap-6">
              <div className="flex-1 w-full">
                <div className="text-sm text-stone-600 mb-1">Selected Items</div>
                <div className="text-2xl font-bold text-stone-900 mb-4">
                  {totalItems} {totalItems === 1 ? 'item' : 'items'} • {totalQuantity} units
                </div>
                
                {totalItems > 0 && (
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-stone-600">Subtotal:</span>
                      <span className="font-semibold text-stone-900">₱{totalCost.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-stone-600">Service Fee (5%):</span>
                      <span className="font-semibold text-stone-900">₱{serviceFee.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-stone-600">Delivery Fee:</span>
                      <span className="font-semibold text-stone-900">₱{deliveryFee.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between pt-2 border-t border-emerald-300">
                      <span className="font-semibold text-stone-900">Total:</span>
                      <span className="text-xl font-bold text-emerald-700">₱{grandTotal.toFixed(2)}</span>
                    </div>
                  </div>
                )}
              </div>
              
              <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto">
                <button
                  onClick={handlePurchase}
                  disabled={totalItems === 0 || restocking}
                  className="px-4 sm:px-6 py-3 bg-white text-emerald-700 font-semibold rounded-xl border-2 border-emerald-600 hover:bg-emerald-50 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-sm sm:text-base whitespace-nowrap"
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  Update Stock Only
                </button>
                
                <button
                  onClick={handleBuyForMe}
                  disabled={totalItems === 0 || restocking}
                  className="px-4 sm:px-6 py-3 bg-gradient-to-r from-amber-500 to-amber-600 text-white font-semibold rounded-xl shadow-md hover:shadow-lg hover:from-amber-600 hover:to-amber-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-sm sm:text-base whitespace-nowrap"
                >
                  {restocking ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                      <span className="hidden sm:inline">Processing...</span>
                    </>
                  ) : (
                    <>
                      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                      <span>Buy for Me</span>
                      <span className="hidden sm:inline">• ₱{grandTotal.toFixed(2)}</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}

      <PaymentModal
        isOpen={paymentModal.isOpen}
        onClose={() => setPaymentModal({ isOpen: false, amount: '' })}
        amount={paymentModal.amount}
        title="Supply Order Payment"
        description="Complete your payment and message us on Facebook. We'll deliver your supplies once payment is confirmed."
      />

      {groceryList.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full p-6 border border-stone-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-xl font-bold text-stone-900">Grocery List</h3>
                <p className="text-sm text-stone-500">Quantities target maximum stock (default 10 when max is unset).</p>
              </div>
              <button
                onClick={() => setGroceryList({ isOpen: false, lines: [] })}
                className="text-stone-500 hover:text-stone-700"
                aria-label="Close grocery list"
              >
                ✕
              </button>
            </div>

            {groceryList.lines.length === 0 ? (
              <div className="text-stone-600 text-sm">All items are at or above their target stock.</div>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto text-sm text-stone-800">
                {groceryList.lines.map((line, idx) => (
                  <div key={idx} className="flex items-start gap-2">
                    <span className="text-stone-400">•</span>
                    <span>{line}</span>
                  </div>
                ))}
              </div>
            )}

            <div className="mt-6 flex gap-3 justify-end">
              <button
                onClick={handleCopyGroceryList}
                className="px-4 py-2 rounded-lg bg-stone-100 text-stone-700 font-medium hover:bg-stone-200"
              >
                Copy
              </button>
              <button
                onClick={handleDownloadGroceryPdf}
                className="px-4 py-2 rounded-lg bg-stone-100 text-stone-700 font-medium hover:bg-stone-200"
              >
                Download PDF
              </button>
              <button
                onClick={() => setGroceryList({ isOpen: false, lines: [] })}
                className="px-4 py-2 rounded-lg bg-emerald-600 text-white font-semibold hover:bg-emerald-700"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </motion.div>
  )
}
