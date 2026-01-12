"use client"
import React, { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import { fetchWithAuth } from '@/lib/fetchWithAuth'
import { useShop } from '@/components/context/ShopContext'

export default function ShopSwitcher({ onChange }: { onChange?: (shopId: string) => void }) {
  const [shops, setShops] = useState<Array<{ id: string; name: string }>>([])
  const [loading, setLoading] = useState(false)
  const { shopId, setShopId } = useShop()
  const [active, setActive] = useState<string | null>(shopId)

  useEffect(() => {
    // initial active shop comes from context/localStorage
    if (shopId) setActive(shopId)
  }, [])

  useEffect(() => {
    async function load() {
      setLoading(true)
      try {
        const res = await fetchWithAuth('/api/shops')
        if (!res.ok) {
          // If unauthorized or no token, just treat as no shops available silently
          if (res.status === 401) return
          const json = await res.json().catch(() => ({}))
          throw new Error(json?.error || 'Failed')
        }
        const json = await res.json()
        setShops(json.data || [])
      } catch (err) {
        console.error('Failed to load shops', err)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  function select(id: string) {
    setActive(id)
    try { setShopId(id) } catch (_) {}
    if (onChange) onChange(id)
  }

  return (
    <div style={{ display: 'inline-flex', gap: 8, alignItems: 'center' }}>
      {loading ? <div>Loading...</div> : (
        <select value={active || ''} onChange={e => select(e.target.value)} style={{ padding: '6px 8px' }}>
          <option value="">— Select shop —</option>
          {shops.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
      )}
    </div>
  )
}
