import { NextResponse } from 'next/server'

// Devices feature removed — return a clear 410 Gone for admin device actions.
export async function POST() {
  return NextResponse.json({ error: 'Devices feature removed' }, { status: 410 })
}

