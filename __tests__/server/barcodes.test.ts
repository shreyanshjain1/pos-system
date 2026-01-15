 

import { POST as assignPOST } from '@/app/api/barcodes/assign/route'

jest.mock('@/lib/supabase/server', () => ({
  getSupabaseAdmin: () => mockSupabase
}))

const mockSupabase: any = {
  from: (table: string) => ({
    select: (_cols: string) => ({
      eq: (_f: string, _v: any) => ({ maybeSingle: async () => ({ data: { id: _v } }) })
    }),
    insert: (payload: any[]) => ({ select: async () => ({ data: payload[0], error: null }) })
  })
}

describe('barcodes assign POST', () => {
  test('returns 400 for missing fields', async () => {
    const req = new Request('http://localhost/api/barcodes/assign', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({}) })
    const res: any = await assignPOST(req)
    expect(res.status).toBe(400)
  })

  test('creates barcode mapping', async () => {
    const payload = { shop_id: 'shop-1', device_id: 'dev-1', code: '123', product_id: 'p1' }
    const req = new Request('http://localhost/api/barcodes/assign', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(payload) })
    const res: any = await assignPOST(req)
    expect([201,200]).toContain(res.status)
    const body = await res.json()
    expect(body.data).toBeDefined()
    expect(body.data.code).toBe('123')
  })
})
