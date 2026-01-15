import { POST as productsPOST } from '@/app/api/products/route'
import { NextResponse } from 'next/server'

// Mock getSupabaseAdmin to control DB responses
jest.mock('@/lib/supabase/server', () => ({
  getSupabaseAdmin: () => mockSupabaseAdmin
}))

const mockSupabaseAdmin: any = {
  auth: {
    getUser: async (token: string) => {
      if (token === 'good') return { data: { user: { id: 'user-1' } }, error: null }
      return { data: { user: { id: null } }, error: { message: 'invalid' } }
    }
  },
  from: (table: string) => {
    return {
      select: (_cols: string) => ({
        eq: (_field: string, _val: any) => ({
          limit: (_n: number) => ({ maybeSingle: async () => ({ data: [{ shop_id: 'shop-1' }] }) }),
          maybeSingle: async () => ({ data: { authoritative_device_id: null, id: 'shop-1' } }),
        }),
        in: (_field: string, _vals: any[]) => ({
          then: async () => ({ data: [] })
        })
      }),
      insert: (payload: any[]) => ({
        select: (_cols: string) => ({ single: async () => ({ data: { id: 'prod-1', ...payload[0], created_at: new Date().toISOString() }, error: null }) })
      }),
    }
  }
}

describe('products POST route', () => {
  test('returns 403 when no shop mapping', async () => {
    const req = new Request('http://localhost/api/products', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ name: 'Sample', price: 10 }) })
    const res: any = await productsPOST(req)
    expect(res.status).toBe(403)
    const body = await res.json()
    expect(body.error).toMatch(/No shop mapping/)
  })

  test('creates product with valid auth', async () => {
    const headers = new Headers({ 'content-type': 'application/json', authorization: 'Bearer good' })
    const req = new Request('http://localhost/api/products', { method: 'POST', headers, body: JSON.stringify({ name: 'Sample', price: 99, stock: 5 }) })
    const res: any = await productsPOST(req)
    expect([201,200]).toContain(res.status)
    const body = await res.json()
    expect(body.data).toBeDefined()
    expect(body.data.name).toBe('Sample')
  })
})
