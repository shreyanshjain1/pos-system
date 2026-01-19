import { NextResponse } from 'next/server'

// Devices feature removed — return 410 Gone for unrevoke operations.
export async function POST() {
  return NextResponse.json({ error: 'Devices feature removed' }, { status: 410 })
}
