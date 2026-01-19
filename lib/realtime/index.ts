import supabase from '@/lib/supabase/client'

type Unsubscribe = () => Promise<void>

/**
 * Subscribe to realtime events for a specific shop (products/inventory).
 * Only initializes a subscription if `checkAdvanced` resolves to true.
 * Returns an unsubscribe function.
 */
export async function subscribeToShopRealtime(shopId: string, onEvent: (payload: any) => void, checkAdvanced?: () => Promise<boolean>): Promise<Unsubscribe> {
  try {
    const can = checkAdvanced ? await checkAdvanced() : true
    if (!can) {
      // Do not initialize realtime for non-advanced plans
      return async () => {}
    }

    // supabase-js v2: create a named channel and subscribe to postgres_changes
    const channelName = `shop-${shopId}-realtime`
    // @ts-ignore - channel types may vary in test env
    const channel = (supabase as any).channel(channelName)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'products', filter: `shop_id=eq.${shopId}` }, (payload: any) => {
        try { onEvent(payload) } catch (e) { console.error('onEvent error', e) }
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'sales', filter: `shop_id=eq.${shopId}` }, (payload: any) => {
        try { onEvent(payload) } catch (e) { console.error('onEvent error', e) }
      })

    // subscribe
    if (typeof channel.subscribe === 'function') {
      await channel.subscribe()
    } else if (typeof (supabase as any).on === 'function') {
      // fallback for older client in tests
      ;(supabase as any).on('postgres_changes', { event: '*', schema: 'public', table: 'products' }, (p: any) => onEvent(p))
    }

    return async () => {
      try {
        if (channel && typeof channel.unsubscribe === 'function') await channel.unsubscribe()
      } catch (e) { /* ignore */ }
    }
  } catch (e) {
    console.warn('subscribeToShopRealtime failed', e)
    return async () => {}
  }
}

export default { subscribeToShopRealtime }
