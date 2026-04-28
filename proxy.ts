import { NextResponse, type NextRequest } from 'next/server'

// Pre-launch HTTP basic-auth gate. Set SITE_PASSWORD (and optional SITE_USER) in env.
// When SITE_PASSWORD is unset the gate is disabled — convenient for local dev.
export function proxy(req: NextRequest) {
  const password = process.env.SITE_PASSWORD
  if (!password) return NextResponse.next()

  const expectedUser = process.env.SITE_USER || 'sideout'
  const auth = req.headers.get('authorization')

  if (auth?.startsWith('Basic ')) {
    try {
      const [user, pass] = atob(auth.slice(6)).split(':')
      if (user === expectedUser && pass === password) return NextResponse.next()
    } catch {}
  }

  return new NextResponse('Authentication required', {
    status: 401,
    headers: { 'WWW-Authenticate': 'Basic realm="SideOut Pickleball — Pre-Launch"' },
  })
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
