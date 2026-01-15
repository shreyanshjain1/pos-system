import { createClient, SupabaseClient } from '@supabase/supabase-js'

let _adminClient: SupabaseClient | null = null

export function getSupabaseAdmin(): SupabaseClient {
  if (_adminClient) return _adminClient

  // Test override: if running tests with TEST_SUPABASE_MOCK=1, return a mock implementation
  if (process.env.TEST_SUPABASE_MOCK === '1') {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const mock = require('../../tests/mockSupabase').getMockSupabase()
    return mock as unknown as SupabaseClient
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !serviceKey) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY for server Supabase client')
  }

  _adminClient = createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  })

  return _adminClient
}

export default getSupabaseAdmin
