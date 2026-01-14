import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  // Guard only /dashboard routes (allow public access to /pos)
  if (!pathname.startsWith('/dashboard')) return NextResponse.next()

  // If no cookies at all, redirect to login
  const cookie = req.headers.get('cookie')
  if (!cookie) {
    const url = req.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  try {
    // call our internal API that will inspect cookie and check acceptance
    const apiUrl = new URL('/api/check-bir', req.url)
    const apiRes = await fetch(apiUrl.toString(), { headers: { cookie } })
    if (!apiRes.ok) {
      const url = req.nextUrl.clone()
      url.pathname = '/login'
      return NextResponse.redirect(url)
    }
    const json = await apiRes.json()
    if (!json.authenticated) {
      const url = req.nextUrl.clone()
      url.pathname = '/login'
      return NextResponse.redirect(url)
    }
    // Distinguish missing shop -> redirect to onboarding creation
    if (!json.has_shop) {
      const url = req.nextUrl.clone()
      url.pathname = '/onboard'
      return NextResponse.redirect(url)
    }

    // For both /pos and /dashboard require user acceptance and admin approval
    if (!json.accepted || !json.approved) {
      const url = req.nextUrl.clone()
      url.pathname = '/onboarding/bir-accept'
      return NextResponse.redirect(url)
    }

    return NextResponse.next()
  } catch (err) {
    const url = req.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }
}

export const config = {
  matcher: ['/dashboard/:path*']
}
