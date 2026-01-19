const mockSupabase: any = {
  rpc: async (_fn: string, _p: any) => ({ data: [{ day: '2025-01-01', count: 3, total: 100 }], error: null })
}

describe('exports reports POST', () => {
  beforeEach(() => {
    jest.resetModules()
    jest.mock('@/lib/supabase/server', () => ({ getSupabaseAdmin: () => mockSupabase }))
  })

  test('blocks non-advanced plans', async () => {
    jest.mock('@/lib/subscription/retailGuard', () => ({
      getRetailShopAndSubscriptionByShopId: async (id: string) => ({ allowed: true, subscription: { plan: 'basic' }, shop: { id } })
    }))
    const { POST: exportPOST } = await import('@/app/api/exports/reports/route')
    const req = new Request('http://localhost/api/exports/reports', { method: 'POST', body: JSON.stringify({ shop_id: 'shop-1', start: '2025-01-01', end: '2025-01-02' }) })
    const res: any = await exportPOST(req)
    expect(res.status).toBe(403)
  })

  test('returns CSV for advanced plan', async () => {
    jest.mock('@/lib/subscription/retailGuard', () => ({
      getRetailShopAndSubscriptionByShopId: async (id: string) => ({ allowed: true, subscription: { plan: 'advanced' }, shop: { id } })
    }))
    const { POST: exportPOST } = await import('@/app/api/exports/reports/route')
    const req = new Request('http://localhost/api/exports/reports', { method: 'POST', body: JSON.stringify({ shop_id: 'shop-1', start: '2025-01-01', end: '2025-01-02' }) })
    const res: any = await exportPOST(req)
    expect(res.status).toBe(200)
    const text = await res.text()
    expect(text.includes('day')).toBeTruthy()
    expect(text.includes('2025-01-01')).toBeTruthy()
  })
})
