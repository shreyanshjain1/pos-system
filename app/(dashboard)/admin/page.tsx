"use client"
import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import Card from '@/components/ui/Card'
import { supabase } from '@/lib/supabase/client'
import fetchWithAuth from '@/lib/fetchWithAuth'
import { motion } from 'framer-motion'
import { pageVariants, cardVariants, staggerContainer, listItem, transitions } from '@/lib/motion'

const OWNER_EMAIL = 'raymart.leyson.rl@gmail.com'
function isOwnerEmail(email?: string | null) {
  if (!email) return false
  return email.toLowerCase().trim() === OWNER_EMAIL.toLowerCase()
}

const ADMIN_SECTIONS = [
  {
    href: '/admin/users',
    label: 'Users',
    description: 'Manage users, invites, and subscriptions',
    icon: <svg viewBox="0 0 24 24" fill="none"><path d="M17 21v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/><circle cx="9" cy="7" r="4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/><path d="M22 21v-2a4 4 0 0 0-3-3.87" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>,
    gradient: 'from-indigo-500 to-indigo-600'
  },
  {
    href: '/admin/shops',
    label: 'Shops',
    description: 'Manage store mappings and settings',
    icon: <svg viewBox="0 0 24 24" fill="none"><path d="M3 9l9-6 9 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/><path d="M21 10v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>,
    gradient: 'from-amber-500 to-amber-600'
  }
]

export default function AdminPage() {
  const [loading, setLoading] = useState(true)
  const [isOwner, setIsOwner] = useState(false)
  const [shops, setShops] = useState<Array<any>>([])
  const [loadingShops, setLoadingShops] = useState(false)
  const [selectedShop, setSelectedShop] = useState<string | null>(null)
  const [supplyOrders, setSupplyOrders] = useState<Array<any>>([])
  const [loadingOrders, setLoadingOrders] = useState(false)

  useEffect(() => {
    let mounted = true
    ;(async () => {
      try {
        const { data } = await supabase.auth.getSession()
        const session = (data as unknown as { session?: { user?: { email?: string } } })?.session
        const email = session?.user?.email ?? null
        if (!mounted) return
        setIsOwner(isOwnerEmail(email))
      } catch (e) {
        // ignore
      } finally {
        if (mounted) setLoading(false)
      }
    })()
    return () => { mounted = false }
  }, [])

  useEffect(() => {
    if (isOwner) {
      fetchShops()
    }
  }, [isOwner])

  const fetchShops = async () => {
    setLoadingShops(true)
    try {
      const resp = await fetchWithAuth('/api/admin/shops')
      if (resp.ok) {
        const data = await resp.json()
        const shopsArray = Array.isArray(data.data) ? data.data : []
        
        // Deduplicate shops by ID
        const uniqueShopsMap = new Map()
        shopsArray.forEach((shop: any) => {
          if (!uniqueShopsMap.has(shop.id)) {
            uniqueShopsMap.set(shop.id, shop)
          }
        })
        
        const uniqueShops = Array.from(uniqueShopsMap.values())
        
        // Filter shops that have supply orders
        const shopsWithOrders = []
        for (const shop of uniqueShops) {
          const ordersResp = await fetchWithAuth(`/api/supply-orders?shop_id=${shop.id}`)
          if (ordersResp.ok) {
            const ordersData = await ordersResp.json()
            const orders = Array.isArray(ordersData.data) ? ordersData.data : []
            if (orders.length > 0) {
              shopsWithOrders.push(shop)
            }
          }
        }
        
        console.log('Shops with supply orders:', shopsWithOrders.length, shopsWithOrders)
        setShops(shopsWithOrders)
      }
    } catch (e) {
      console.error('Failed to load shops', e)
      setShops([])
    } finally {
      setLoadingShops(false)
    }
  }

  const fetchSupplyOrders = async (shopId: string) => {
    setLoadingOrders(true)
    try {
      const resp = await fetchWithAuth(`/api/supply-orders?shop_id=${shopId}`, {
        method: 'GET'
      })
      if (resp.ok) {
        const data = await resp.json()
        setSupplyOrders(Array.isArray(data.data) ? data.data : [])
      } else {
        setSupplyOrders([])
      }
    } catch (e) {
      console.error('Failed to load supply orders', e)
      setSupplyOrders([])
    } finally {
      setLoadingOrders(false)
    }
  }

  const handleDelivered = async (orderId: string) => {
    try {
      const resp = await fetchWithAuth(`/api/supply-orders/${orderId}`, {
        method: 'DELETE'
      })
      
      if (resp.ok) {
        setSupplyOrders(prev => prev.filter(order => order.id !== orderId))
      } else {
        alert('Failed to mark as delivered')
      }
    } catch (e) {
      console.error('Failed to mark as delivered', e)
      alert('Failed to mark as delivered')
    }
  }

  const handleDeliverAll = async () => {
    if (supplyOrders.length === 0) return
    
    try {
      for (const order of supplyOrders) {
        await fetchWithAuth(`/api/supply-orders/${order.id}`, {
          method: 'DELETE'
        })
      }
      setSupplyOrders([])
      alert('All orders marked as delivered')
    } catch (e) {
      console.error('Failed to deliver all', e)
      alert('Failed to deliver all orders')
    }
  }

  const handleShopClick = (shopId: string) => {
    setSelectedShop(shopId)
    fetchSupplyOrders(shopId)
  }

  const handleBack = () => {
    setSelectedShop(null)
    setSupplyOrders([])
    fetchShops()
  }

  // Calculate totals for summary
  const totalSubtotal = supplyOrders.reduce((sum, order) => sum + Number(order.subtotal ?? 0), 0)
  const totalServiceFee = supplyOrders.reduce((sum, order) => sum + Number(order.service_fee ?? 0), 0)
  const totalTransactionFee = supplyOrders.length > 0 ? 500 : 0 // ₱500 transaction fee per order batch

  if (loading) return (
    <div className="p-6">
      <div className="h-32 animate-pulse bg-stone-200 rounded-xl" />
    </div>
  )

  // Restrict to owner email only
  if (!isOwner) {
    return (
      <motion.div variants={pageVariants} initial="hidden" animate="visible">
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-stone-900 tracking-tight">Admin Dashboard</h2>
          <p className="text-sm text-stone-500 mt-1">Manage users and shops</p>
        </div>
        <Card className="p-8 text-center max-w-md mx-auto">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <h3 className="text-xl font-bold text-stone-900 mb-2">Access Restricted</h3>
          <p className="text-sm text-stone-600 mb-6">Admin dashboard is only available to authorized administrators. Contact support if you need access.</p>
          <a href="/dashboard" className="inline-block w-full py-2.5 px-6 bg-gradient-to-r from-stone-500 to-stone-600 text-white rounded-xl hover:from-stone-600 hover:to-stone-700 font-semibold transition-all shadow-sm hover:shadow-md">
            Back to Dashboard
          </a>
        </Card>
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
      {selectedShop ? (
        // Supply Orders View
        <>
          <div className="mb-8 flex items-center gap-4">
            <button
              onClick={handleBack}
              className="p-2 hover:bg-stone-100 rounded-xl transition-colors"
            >
              <svg className="w-6 h-6 text-stone-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M19 12H5M12 19l-7-7 7-7" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
            <div>
              <h2 className="text-3xl font-bold tracking-tight text-stone-900">Supply Orders</h2>
              <p className="text-sm text-stone-500 mt-1">Shop: {shops.find(s => s.id === selectedShop)?.name || selectedShop}</p>
            </div>
          </div>

          {loadingOrders ? (
            <div className="flex items-center justify-center min-h-[400px]">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
            </div>
          ) : supplyOrders.length === 0 ? (
            <Card className="p-12 text-center">
              <div className="w-16 h-16 bg-stone-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-stone-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="3" width="18" height="18" rx="2"/>
                  <path d="M3 9h18"/>
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-stone-900 mb-2">No Supply Orders</h3>
              <p className="text-stone-600">This shop hasn't placed any supply orders yet.</p>
            </Card>
          ) : (
            <motion.div 
              className="bg-white rounded-2xl border border-stone-200 shadow-sm overflow-hidden"
              variants={cardVariants}
            >
              <div className="overflow-x-auto -mx-4 sm:mx-0">
                <table className="w-full min-w-[700px]">
                  <thead className="bg-stone-50 border-b border-stone-200">
                    <tr>
                      <th className="px-3 sm:px-6 py-3 sm:py-4 text-left text-xs font-semibold text-stone-700 uppercase tracking-wider">Product</th>
                      <th className="px-3 sm:px-6 py-3 sm:py-4 text-left text-xs font-semibold text-stone-700 uppercase tracking-wider">Quantity</th>
                      <th className="px-3 sm:px-6 py-3 sm:py-4 text-left text-xs font-semibold text-stone-700 uppercase tracking-wider hidden sm:table-cell">Cost</th>
                      <th className="px-3 sm:px-6 py-3 sm:py-4 text-left text-xs font-semibold text-stone-700 uppercase tracking-wider">Subtotal</th>
                      <th className="px-3 sm:px-6 py-3 sm:py-4 text-left text-xs font-semibold text-stone-700 uppercase tracking-wider hidden lg:table-cell">Service Fee</th>
                      <th className="px-3 sm:px-6 py-3 sm:py-4 text-left text-xs font-semibold text-stone-700 uppercase tracking-wider">Total</th>
                      <th className="px-3 sm:px-6 py-3 sm:py-4 text-left text-xs font-semibold text-stone-700 uppercase tracking-wider hidden lg:table-cell">Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-200">
                    {supplyOrders.map((order) => (
                      <tr key={order.id} className="hover:bg-stone-50 transition-colors">
                        <td className="px-3 sm:px-6 py-3 sm:py-4 font-medium text-stone-900 text-sm">{order.product_name}</td>
                        <td className="px-3 sm:px-6 py-3 sm:py-4 text-stone-700 text-sm">{order.quantity}</td>
                        <td className="px-3 sm:px-6 py-3 sm:py-4 text-stone-700 text-sm hidden sm:table-cell">₱{Number(order.cost ?? 0).toFixed(2)}</td>
                        <td className="px-3 sm:px-6 py-3 sm:py-4 text-stone-700 text-sm">₱{Number(order.subtotal ?? 0).toFixed(2)}</td>
                        <td className="px-3 sm:px-6 py-3 sm:py-4 text-stone-700 text-sm hidden lg:table-cell">₱{Number(order.service_fee ?? 0).toFixed(2)}</td>
                        <td className="px-3 sm:px-6 py-3 sm:py-4 font-semibold text-stone-900 text-sm">₱{(Number(order.subtotal ?? 0) + Number(order.service_fee ?? 0)).toFixed(2)}</td>
                        <td className="px-3 sm:px-6 py-3 sm:py-4 text-stone-600 text-xs sm:text-sm hidden lg:table-cell">{new Date(order.created_at).toLocaleDateString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {supplyOrders.length > 0 && (
                <div className="px-6 py-6 bg-gradient-to-r from-emerald-50 to-emerald-100 border-t border-emerald-200">
                  <div className="mb-4 space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-stone-700 font-medium">Subtotal:</span>
                      <span className="text-stone-900 font-semibold">₱{totalSubtotal.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-stone-700 font-medium">Service Fee (5%):</span>
                      <span className="text-stone-900 font-semibold">₱{totalServiceFee.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between items-center border-t border-emerald-200 pt-3">
                      <span className="text-stone-700 font-medium">Transaction Fee:</span>
                      <span className="text-stone-900 font-semibold">₱{totalTransactionFee.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between items-center pt-3 border-t-2 border-emerald-300">
                      <span className="text-lg font-bold text-stone-900">Grand Total:</span>
                      <span className="text-2xl font-bold text-emerald-700">₱{(totalSubtotal + totalServiceFee + totalTransactionFee).toFixed(2)}</span>
                    </div>
                  </div>
                  <div className="flex justify-end mt-6">
                    <button
                      onClick={handleDeliverAll}
                      className="px-6 py-2.5 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white font-semibold rounded-lg transition-all shadow-md hover:shadow-lg"
                    >
                      Deliver All
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </>
      ) : (
        // Main Admin View
        <>
          <div className="mb-8">
            <h2 className="text-3xl font-bold tracking-tight text-stone-900">Admin</h2>
            <p className="text-sm text-stone-500 mt-1">Owner-only administrative area. Manage users, shops, and supply orders.</p>
          </div>

          <motion.div 
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12"
            variants={staggerContainer}
            initial="hidden"
            animate="visible"
          >
            {ADMIN_SECTIONS.map((section) => (
              <motion.li key={section.href} variants={listItem} className="list-none">
                <Link href={section.href}>
                  <Card className="p-6 h-full group relative overflow-hidden cursor-pointer">
                    <motion.div 
                      className="absolute inset-0 bg-gradient-to-br opacity-0 group-hover:opacity-5 transition-opacity"
                      style={{ backgroundImage: `linear-gradient(135deg, var(--tw-gradient-stops))` }}
                    />
                    <div className="relative z-10 space-y-4">
                      <motion.div 
                        className={`w-12 h-12 rounded-xl bg-gradient-to-br ${section.gradient} text-white flex items-center justify-center shadow-sm`}
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.95 }}
                      >
                        <div className="w-6 h-6">{section.icon}</div>
                      </motion.div>
                      <div>
                        <h3 className="text-lg font-semibold text-stone-900">{section.label}</h3>
                        <p className="text-sm text-stone-500 mt-1">{section.description}</p>
                      </div>
                    </div>
                    <motion.div 
                      className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity"
                      whileHover={{ x: 4 }}
                    >
                      <svg className="w-5 h-5 text-emerald-600" viewBox="0 0 24 24" fill="none"><path d="M5 12h14M12 5l7 7-7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                    </motion.div>
                  </Card>
                </Link>
              </motion.li>
            ))}
          </motion.div>

          {/* Supply Section */}
          <div className="mb-8">
            <h3 className="text-2xl font-bold tracking-tight text-stone-900">Supply Management</h3>
            <p className="text-sm text-stone-500 mt-1">View supply orders from shops</p>
          </div>

          {loadingShops ? (
            <div className="flex items-center justify-center min-h-[300px]">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
            </div>
          ) : (
            <motion.div 
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6"
              variants={staggerContainer}
              initial="hidden"
              animate="visible"
            >
              {shops.length === 0 ? (
                <Card className="p-6 md:col-span-2 lg:col-span-3 text-center bg-stone-50">
                <p className="text-stone-600">No shops available</p>
              </Card>
            ) : (
              shops.map((shop) => (
                <motion.div 
                  key={shop.id} 
                  variants={listItem}
                  onClick={() => handleShopClick(shop.id)}
                  className="cursor-pointer h-full"
                >
                  <Card className="p-6 h-full min-h-[200px] group relative overflow-hidden hover:shadow-xl transition-all border-2 border-stone-200 hover:border-emerald-400 bg-white">
                    <div className="absolute inset-0 bg-gradient-to-br from-emerald-50 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
                    <div className="relative z-10 h-full flex flex-col justify-between">
                      <div>
                        <div className="w-14 h-14 bg-gradient-to-br from-emerald-500 to-emerald-600 text-white rounded-lg flex items-center justify-center font-bold text-lg mb-4 shadow-md flex-shrink-0">
                          {shop.name?.[0]?.toUpperCase() || '?'}
                        </div>
                        <h4 className="text-xl font-bold text-stone-900 mb-2">{shop.name}</h4>
                        <p className="text-sm text-stone-600">{shop.address || 'No address provided'}</p>
                      </div>
                      <motion.div 
                        className="mt-6 inline-flex items-center gap-2 text-emerald-600 font-bold text-base group-hover:text-emerald-700"
                        whileHover={{ x: 4 }}
                        transition={{ type: 'spring', stiffness: 400 }}
                      >
                        View Orders
                        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                          <path d="M5 12h14M12 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      </motion.div>
                    </div>
                  </Card>
                </motion.div>
              ))
            )}
            </motion.div>
          )}
        </>
      )}
    </motion.div>
  )
}
