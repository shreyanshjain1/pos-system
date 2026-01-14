import { NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase/server'

const OWNER_EMAIL = 'raymart.leyson.rl@gmail.com'

export async function POST() {
  // Offline/main-POS management is disabled for now.
  return NextResponse.json({ error: 'This endpoint has been disabled' }, { status: 410 })
}
