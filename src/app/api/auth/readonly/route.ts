import { NextRequest, NextResponse } from 'next/server';

/**
 * Connexion à accès restreint (#30/#69).
 * Profils : tresorier, secretaire, readonly — tous en lecture seule
 * (le proxy bloque les routes d'écriture). Le rôle est conservé pour
 * l'affichage et de futures permissions fines.
 * Token = btoa(motDePasseAdmin + '::' + role) — impossible à forger sans le mot de passe.
 */
const FALLBACK_PASSWORD = 'habadlyon2025';
const ROLES = ['readonly', 'tresorier', 'secretaire'];

export async function POST(req: NextRequest) {
  const { token } = await req.json();
  if (!token) return NextResponse.json({ error: 'Token manquant' }, { status: 400 });

  const expected = process.env.ADMIN_PASSWORD ?? FALLBACK_PASSWORD;
  let role = '';
  try {
    const decoded = atob(token);
    const sep = decoded.lastIndexOf('::');
    if (sep > 0 && decoded.slice(0, sep) === expected) role = decoded.slice(sep + 2);
  } catch { role = ''; }

  if (!ROLES.includes(role)) return NextResponse.json({ error: 'Token invalide' }, { status: 401 });

  const opts = { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax' as const, maxAge: 60 * 60 * 8, path: '/' };
  const res = NextResponse.json({ ok: true });
  res.cookies.set('hl_admin', 'authenticated', opts);
  res.cookies.set('hl_role', role, opts);
  return res;
}
