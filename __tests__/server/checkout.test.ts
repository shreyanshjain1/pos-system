import { POST as checkoutPOST } from '@/app/api/checkout/route'

jest.mock('@/lib/supabase/server', () => ({
  getSupabaseAdmin: () => mockSupabase
}))

const mockSupabase: any = {
  auth: { getUser: async (token: string) => ({ data: { user: { id: token === 'good' ? 'user-1' : null } } }) },
  from: (table: string) => ({
    select: (_cols: string) => ({
      eq: (_f: string, _v: any) => ({ limit: (_n: number) => ({ maybeSingle: async () => ({ data: [{ shop_id: 'shop-1' }] }) }) })
    }),
    // used by unique checks
    update: () => ({ select: () => ({ maybeSingle: async () => ({ data: null }) }) })
  }),
  rpc: async (_fn: string, _payload: any) => ({ data: { sale: { id: 'sale-1' } }, error: null })
}

describe('checkout POST', () => {
  test('returns 403 without shop mapping', async () => {
    const req = new Request('http://localhost/api/checkout', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ items: [] }) })
    const res: any = await checkoutPOST(req)
    expect(res.status).toBe(403)
  })

  test('creates sale with valid auth', async () => {
    const headers = new Headers({ 'content-type': 'application/json', authorization: 'Bearer good' })
    const req = new Request('http://localhost/api/checkout', { method: 'POST', headers, body: JSON.stringify({ items: [{ product_id: 'p1', quantity: 1 }], total: 100 }) })
    const res: any = await checkoutPOST(req)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.data).toBeDefined()
  })
})
