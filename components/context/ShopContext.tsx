"use client"
import React, { createContext, useContext, useEffect, useState } from 'react'

type ShopContextValue = {
  shopId: string | null
  setShopId: (id: string | null) => void
}

const ShopContext = createContext<ShopContextValue | undefined>(undefined)

export function ShopProvider({ children }: { children: React.ReactNode }) {
  const [shopId, setShopIdState] = useState<string | null>(() => {
    try {
      return localStorage.getItem('pos:active-shop')
    } catch (_) {
      return null
    }
  })

  function setShopId(id: string | null) {
    try {
      if (id) localStorage.setItem('pos:active-shop', id)
      else localStorage.removeItem('pos:active-shop')
    } catch (_) {}
    setShopIdState(id)
  }

  return <ShopContext.Provider value={{ shopId, setShopId }}>{children}</ShopContext.Provider>
}

export function useShop() {
  const ctx = useContext(ShopContext)
  if (!ctx) throw new Error('useShop must be used within ShopProvider')
  return ctx
}

export default ShopContext
