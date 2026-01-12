import { NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase/server'

export async function GET() {
  return NextResponse.json({ error: 'Categories removed' }, { status: 404 })
}

export async function POST() {
  return NextResponse.json({ error: 'Categories removed' }, { status: 404 })
}
