import { NextResponse } from 'next/server'

// Devices feature removed — do not attempt to register devices.
export async function POST() {
  return NextResponse.json({ error: 'Devices feature removed' }, { status: 410 })
}
