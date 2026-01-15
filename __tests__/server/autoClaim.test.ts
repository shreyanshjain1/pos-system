import { POST as autoClaimPOST } from '@/app/api/shops/auto-claim/route'

jest.mock('@/lib/supabase/server', () => ({
  getSupabaseAdmin: () => mockSupabase
}))

const mockSupabase: any = {
  auth: { getUser: async (token: string) => ({ data: { user: { id: token } } }) },
  from: (table: string) => ({
    select: (_cols: string) => ({
      eq: (_f: string, _v: any) => ({ limit: (_n: number) => ({ maybeSingle: async () => ({ data: null }) }) }),
      maybeSingle: async () => ({ data: null })
    }),
    update: (_payload: any) => ({ eq: (_f: string, _v: any) => ({ select: () => ({ maybeSingle: async () => ({ data: { id: 'shop-1', authoritative_device_id: 'dev-1' } }) }) }) })
  })
}

describe('auto-claim POST', () => {
  test('sets authoritative device when null', async () => {
    const payload = { shop_id: 'shop-1', device_id: 'dev-1' }
    const req = new Request('http://localhost/api/shops/auto-claim', { method: 'POST', headers: { 'content-type': 'application/json', authorization: 'Bearer user-1' }, body: JSON.stringify(payload) })
    const res: any = await autoClaimPOST(req)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.ok).toBe(true)
  })
})
