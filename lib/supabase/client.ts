import { createClient, SupabaseClient } from '@supabase/supabase-js'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

export const isSupabaseConfigured = Boolean(url && anonKey)

if (!isSupabaseConfigured) {
  console.warn('Supabase not configured: set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY')
}

let _supabase: SupabaseClient | null = null

if (isSupabaseConfigured) {
  _supabase = createClient(url, anonKey, {
    auth: {
      persistSession: true,
      detectSessionInUrl: false,
    },
    global: {
      headers: { 'x-app-name': 'pos-nextjs' }
    }
  })
}

// Export a safe supabase reference. When not configured, expose a minimal stub
// that throws a clear, actionable error when auth methods are used. This avoids
// import-time crashes and lets UI show friendly messages.
const missingErr = new Error('Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local')

const stub: any = {
  auth: new Proxy({}, {
    get() {
      return async () => { throw missingErr }
    }
  })
}

export const supabase: SupabaseClient | any = _supabase || stub

export default supabase
