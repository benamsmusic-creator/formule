import { NextRequest, NextResponse } from 'next/server';

const PROTECTED = ['/dashboard', '/builder', '/clients', '/parametres', '/newsletter', '/yahrzeit', '/annuaire', '/annonces', '/anniversaires', '/historique', '/membres', '/plan', '/encheres', '/sms', '/calendrier'];
// Note: /compte is protected client-side (redirects to /user-login if no session in localStorage)
const COOKIE_NAME = 'hl_admin';

// Routes interdites aux rôles restreints (#30/#69) — lecture seule, pas de modification
const READONLY_BLOCKED = ['/builder', '/parametres', '/newsletter', '/sms', '/annonces', '/clients'];
const RESTRICTED_ROLES = ['readonly', 'tresorier', 'secretaire'];

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

  // Rôles restreints (lecture seule) : bloque les routes d'écriture (#30/#69)
  const role = req.cookies.get('hl_role')?.value;
  if (role && RESTRICTED_ROLES.includes(role) && READONLY_BLOCKED.some((p) => pathname.startsWith(p))) {
    const dashUrl = new URL('/dashboard', req.url);
    dashUrl.searchParams.set('notice', 'readonly');
    return NextResponse.redirect(dashUrl);
  }

  // /clients réservé au super-admin (admin sans organisation rattachée)
  if (pathname.startsWith('/clients') && req.cookies.get('hl_org')?.value) {
    return NextResponse.redirect(new URL('/dashboard', req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/dashboard/:path*', '/builder/:path*', '/clients/:path*', '/parametres/:path*', '/newsletter/:path*', '/yahrzeit/:path*', '/annuaire/:path*', '/annonces/:path*', '/anniversaires/:path*', '/historique/:path*', '/membres/:path*', '/plan/:path*', '/encheres/:path*', '/sms/:path*', '/calendrier/:path*'],
};
