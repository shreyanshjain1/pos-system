import { NextResponse } from 'next/server'

// Devices feature removed — return an empty list to callers.
export async function GET() {
  return NextResponse.json({ data: [] })
}
