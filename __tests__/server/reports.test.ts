import { GET as reportsGET } from '@/app/api/reports/sales/route'

jest.mock('@/lib/supabase/server', () => ({
  getSupabaseAdmin: () => mockSupabase
}))

jest.mock('@/lib/subscription/retailGuard', () => ({
  getRetailShopAndSubscriptionByShopId: async (id: string) => ({ allowed: true, subscription: { plan: 'basic' }, shop: { id } })
}))

const mockSalesRows = [
  { created_at: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(), total: 10 }, // yesterday
  { created_at: new Date().toISOString(), total: 5 } // today
]

const mockSupabase: any = {
  auth: { getUser: async (_token: string) => ({ data: { user: { id: 'user-1' } }, error: null }) },
  from: (table: string) => {
    if (table === 'user_shops') {
      return { select: (_cols: string) => ({ eq: (_f: string, _v: any) => ({ then: async (resolve: any) => resolve({ data: [{ shop_id: 'shop-1' }] }) }) }) }
    }
    if (table === 'sales') {
      let minDate: string | null = null
      let maxDate: string | null = null
      const q: any = {
        select: (_cols: string) => q,
        in: (_col: string, _vals: any) => q,
        gte: (_c: string, v: any) => { minDate = v; return q },
        lte: (_c: string, v: any) => { maxDate = v; return q },
        then: async (resolve: any) => {
          const rows = mockSalesRows.filter(r => {
            const d = new Date(r.created_at).toISOString()
            if (minDate && d < minDate) return false
            if (maxDate && d > maxDate) return false
            return true
          })
          return resolve({ data: rows, error: null })
        }
      }
      return q
    }
    if (table === 'products') {
      const q: any = { then: async (resolve: any) => resolve({ data: [{ id: 'p1' }, { id: 'p2' }], error: null }) }
      q.in = (_f: string, _v: any) => q
      q.lt = (_f: string, _v: any) => q
      q.gte = (_f: string, _v: any) => q
      q.select = (_cols: string) => q
      return q
    }
    return { select: (_cols: string) => ({ then: async (resolve: any) => resolve({ data: [] }) }) }
  }
}

describe('reports sales GET', () => {
  test('returns 403 when no shop mapping', async () => {
    const badSupabase = { from: () => ({ select: () => ({ eq: () => ({ then: async (r: any) => r({ data: [] }) }) }) }) } as any
    // override getSupabaseAdmin to return empty mapping
    jest.doMock('@/lib/supabase/server', () => ({ getSupabaseAdmin: () => badSupabase }))
    const req = new Request('http://localhost/api/reports/sales')
    const res: any = await reportsGET(req)
    expect(res.status).toBe(403)
  })

  test('basic plan limited to today only', async () => {
    const today = new Date().toISOString().slice(0, 10)
    const url = `http://localhost/api/reports/sales?from=2000-01-01&to=2099-01-01`
    const req = new Request(url, { headers: { authorization: 'Bearer token' } })
    const res: any = await reportsGET(req)
    expect([200,201,202,203,204,205,206,207,208,209].includes(res.status)).toBeTruthy()
    const body = await res.json()
    // timeseries should only include today's date for basic plan
    expect(body.timeseries.every((t: any) => t.t === today)).toBeTruthy()
  })

  test('pro plan allows multi-day range', async () => {
    // mock supabase and guard to simulate pro plan
    jest.resetModules()
    const mockSupabase: any = {
      auth: { getUser: async (_token: string) => ({ data: { user: { id: 'user-1' } }, error: null }) },
      from: (table: string) => {
        if (table === 'user_shops') {
          return { select: (_cols: string) => ({ eq: (_f: string, _v: any) => ({ then: async (resolve: any) => resolve({ data: [{ shop_id: 'shop-1' }] }) }) }) }
        }
        if (table === 'sales') {
          let minDate: string | null = null
          let maxDate: string | null = null
          const sample = [
            { created_at: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(), total: 10 },
            { created_at: new Date().toISOString(), total: 5 }
          ]
          const q: any = {
            select: (_cols: string) => q,
            in: (_col: string, _vals: any) => q,
            gte: (_c: string, v: any) => { minDate = v; return q },
            lte: (_c: string, v: any) => { maxDate = v; return q },
            then: async (resolve: any) => {
              const rows = sample.filter(r => {
                const d = new Date(r.created_at).toISOString()
                if (minDate && d < minDate) return false
                if (maxDate && d > maxDate) return false
                return true
              })
              return resolve({ data: rows, error: null })
            }
          }
          return q
        }
        if (table === 'products') {
          const q: any = { then: async (resolve: any) => resolve({ data: [{ id: 'p1' }, { id: 'p2' }], error: null }) }
          q.in = (_f: string, _v: any) => q
          q.lt = (_f: string, _v: any) => q
          q.gte = (_f: string, _v: any) => q
          q.select = (_cols: string) => q
          return q
        }
        return { select: (_cols: string) => ({ then: async (resolve: any) => resolve({ data: [] }) }) }
      }
    }

    jest.doMock('@/lib/supabase/server', () => ({ getSupabaseAdmin: () => mockSupabase }))
    jest.doMock('@/lib/subscription/retailGuard', () => ({ getRetailShopAndSubscriptionByShopId: async (id: string) => ({ allowed: true, subscription: { plan: 'pro' }, shop: { id } }) }))

    const { GET: reportsGET } = await import('@/app/api/reports/sales/route')
    const url = `http://localhost/api/reports/sales?from=2000-01-01&to=2099-01-01`
    const req = new Request(url, { headers: { authorization: 'Bearer token' } })
    const res: any = await reportsGET(req)
    expect([200,201,202,203,204,205,206,207,208,209].includes(res.status)).toBeTruthy()
    const body = await res.json()
    // timeseries should include multiple dates for pro plan
    const days = new Set(body.timeseries.map((t: any) => t.t))
    expect(days.size).toBeGreaterThan(1)
  })
})
