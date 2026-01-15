 

import { POST as assignPOST } from '@/app/api/barcodes/assign/route'

jest.mock('@/lib/supabase/server', () => ({
  getSupabaseAdmin: () => mockSupabase
}))

jest.mock('@/lib/deviceAuth', () => ({
  enforceDeviceWritePermission: async () => ({ allowed: false, reason: 'device_mismatch' })
}))

const mockSupabase: any = {
  auth: { getUser: async (token: string) => ({ data: { user: { id: token === 'good' ? 'user-1' : null } } }) },
  from: (_: string) => ({ insert: async () => ({ data: null, error: null }) })
}

describe('barcodes assign POST', () => {
  test('returns 403 when device check fails', async () => {
    const payload = { shop_id: 'shop-1', device_id: 'dev-x', code: '123', product_id: 'p1' }
    const req = new Request('http://localhost/api/barcodes/assign', { method: 'POST', headers: { 'content-type': 'application/json', authorization: 'Bearer good' }, body: JSON.stringify(payload) })
    const res: any = await assignPOST(req)
    expect(res.status).toBe(403)
    const body = await res.json()
    expect(body.error).toBeDefined()
  })
})
