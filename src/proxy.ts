import { NextRequest, NextResponse } from 'next/server'

const PUBLIC_PATHS = ['/', '/login', '/register', '/library']

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Permitir caminhos públicos
  if (PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p + '/'))) {
    return NextResponse.next()
  }

  // Rotas de dashboard e admin são protegidas via AuthContext no client.
  // A proteção real acontece nos layouts client-side (useAuth + router.push('/login')).

  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * Ignorar arquivos estáticos e internos do Next.js
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.png$|.*\\.svg$).*)',
  ],
}
