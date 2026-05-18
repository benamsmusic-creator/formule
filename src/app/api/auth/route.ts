import { NextRequest, NextResponse } from 'next/server';

const COOKIE_NAME = 'hl_admin';
const COOKIE_MAX_AGE = 60 * 60 * 24 * 30; // 30 jours

// Mot de passe de secours si la variable d'env n'est pas définie
const FALLBACK_PASSWORD = 'habadlyon2025';

export async function POST(req: NextRequest) {
  const { password } = await req.json();
  const expected = process.env.ADMIN_PASSWORD ?? FALLBACK_PASSWORD;

  if (password !== expected) {
    return NextResponse.json({ error: 'Mot de passe incorrect' }, { status: 401 });
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set(COOKIE_NAME, 'authenticated', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: COOKIE_MAX_AGE,
    path: '/',
  });
  return res;
}

export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set(COOKIE_NAME, '', { maxAge: 0, path: '/' });
  return res;
}
