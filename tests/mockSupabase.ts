export function getMockSupabase() {
  const mock: any = {
    // minimal auth.getUser used by routes
    auth: {
      getUser: async (token: string) => {
        if (!token) return { data: { user: { id: null } }, error: { message: 'invalid' } }
        return { data: { user: { id: token === 'good' ? 'user-1' : null } }, error: null }
      }
    },
    // simple query builder mimic for .from(...).select(...).eq(...).maybeSingle() etc
    from: (table: string) => {
      return {
        select: (_cols: string) => ({
          eq: (_field: string, val: any) => ({
            limit: (_n?: number) => ({ maybeSingle: async () => {
              // user_shops mapping
              if (table === 'user_shops') return { data: [{ shop_id: val === 'user-1' ? 'shop-1' : null }] }
              return { data: null }
            } }),
            maybeSingle: async () => {
              if (table === 'shops') return { data: { id: val, authoritative_device_id: null } }
              if (table === 'products') return { data: null }
              return { data: null }
            }
          }),
          in: (_field: string, _vals: any[]) => ({ then: async () => ({ data: [] }) })
        }),
        insert: (payload: any[]) => ({
          select: (_cols?: string) => ({ single: async () => ({ data: { id: 'mock-' + Date.now(), ...payload[0], created_at: new Date().toISOString() }, error: null }) }),
          maybeSingle: async () => ({ data: payload[0], error: null })
        }),
        update: (_payload: any) => ({
          eq: (_field: string, _val: any) => ({ maybeSingle: async () => ({ data: null }) })
        }),
        delete: () => ({ eq: (_f: string, _v: any) => ({}) })
      }
    },
    rpc: async (_fn: string, _payload: any) => ({ data: { sale: { id: 'sale-mock-1' } }, error: null })
  }

  return mock
}

export default getMockSupabase
