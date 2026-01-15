import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Minimal no-op middleware to satisfy Next.js while auth/shop checks
// are handled in server layouts. This file can be removed entirely once
// the migration to server-side guards is confirmed and any platform
// requirements are met.
export function middleware(_req: NextRequest) {
  return NextResponse.next()
}

export const config = {
  matcher: []
}
