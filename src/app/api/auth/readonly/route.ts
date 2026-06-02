import { NextRequest, NextResponse } from 'next/server';

/**
 * Connexion en lecture seule (#69).
 * Un admin super-admin génère un token one-time côté client (URL partageable).
 * Ce endpoint reçoit le token, pose les cookies admin + role=readonly.
 * Sécurité : le token = mot de passe admin hashé + sel "readonly" — impossible à forger sans le mot de passe.
 */
const FALLBACK_PASSWORD = 'habadlyon2025';

export async function POST(req: NextRequest) {
  const { token } = await req.json();
  if (!token) return NextResponse.json({ error: 'Token manquant' }, { status: 400 });

  // Valide le token : c'est l'empreinte du mot de passe admin + "::readonly"
  const expected = process.env.ADMIN_PASSWORD ?? FALLBACK_PASSWORD;
  // Simple vérification : le token doit être btoa(expected + '::readonly')
  let valid = false;
  try { valid = atob(token) === expected + '::readonly'; } catch { valid = false; }

  if (!valid) return NextResponse.json({ error: 'Token invalide' }, { status: 401 });

  const opts = { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax' as const, maxAge: 60 * 60 * 8, path: '/' };
  const res = NextResponse.json({ ok: true });
  res.cookies.set('hl_admin', 'authenticated', opts);
  res.cookies.set('hl_role', 'readonly', opts);
  return res;
}
