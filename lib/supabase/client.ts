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

type AuthStub = {
  getSession: () => Promise<{ data?: { session?: { access_token?: string }; user?: { email?: string } } }> 
  signInWithPassword: (creds: { email: string; password: string }) => Promise<{ data?: unknown; error?: unknown }>
  signUp: (creds: { email: string; password: string }) => Promise<{ data?: unknown; error?: unknown }>
}

const stub: { auth: AuthStub } = {
  auth: {
    getSession: async () => { throw missingErr },
    signInWithPassword: async () => { throw missingErr },
    signUp: async () => { throw missingErr },
  }
}

export const supabase: SupabaseClient | { auth: AuthStub } = _supabase || stub

export default supabase
