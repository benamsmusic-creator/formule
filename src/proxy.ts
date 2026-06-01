import { NextRequest, NextResponse } from 'next/server';

const PROTECTED = ['/dashboard', '/builder', '/clients'];
// Note: /compte is protected client-side (redirects to /user-login if no session in localStorage)
const COOKIE_NAME = 'hl_admin';

export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  const isProtected = PROTECTED.some((p) => pathname.startsWith(p));
  if (!isProtected) return NextResponse.next();

  const token = req.cookies.get(COOKIE_NAME)?.value;
  if (!token || token !== 'authenticated') {
    const loginUrl = new URL('/login', req.url);
    loginUrl.searchParams.set('from', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // /clients réservé au super-admin (admin sans organisation rattachée)
  if (pathname.startsWith('/clients') && req.cookies.get('hl_org')?.value) {
    return NextResponse.redirect(new URL('/dashboard', req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/dashboard/:path*', '/builder/:path*', '/clients/:path*'],
};
