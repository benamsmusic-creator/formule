import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { supabaseAdmin } from '@/lib/supabase-admin';

const COOKIE_NAME = 'hl_admin';
const ORG_COOKIE = 'hl_org';
const COOKIE_MAX_AGE = 60 * 60 * 24 * 30; // 30 jours

// Mot de passe de secours si la variable d'env n'est pas définie
const FALLBACK_PASSWORD = 'habadlyon2025';

function authCookieOpts() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    maxAge: COOKIE_MAX_AGE,
    path: '/',
  };
}

export async function POST(req: NextRequest) {
  const { password, email } = await req.json();

  // ── Connexion par compte admin (email + mot de passe) ───────────────
  if (email) {
    const { data: admin } = await supabaseAdmin
      .from('admins')
      .select('id, password_hash, org_id')
      .eq('email', String(email).toLowerCase().trim())
      .single();

    if (!admin || !(await bcrypt.compare(password ?? '', admin.password_hash))) {
      return NextResponse.json({ error: 'Identifiants incorrects' }, { status: 401 });
    }

    const res = NextResponse.json({ ok: true, org: admin.org_id });
    res.cookies.set(COOKIE_NAME, 'authenticated', authCookieOpts());
    res.cookies.set(ORG_COOKIE, admin.org_id ?? '', authCookieOpts());
    return res;
  }

  // ── Connexion super-admin (mot de passe maître) — INCHANGÉ ──────────
  const expected = process.env.ADMIN_PASSWORD ?? FALLBACK_PASSWORD;
  if (password !== expected) {
    return NextResponse.json({ error: 'Mot de passe incorrect' }, { status: 401 });
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set(COOKIE_NAME, 'authenticated', authCookieOpts());
  // Super-admin : pas d'organisation → voit tout
  res.cookies.set(ORG_COOKIE, '', { maxAge: 0, path: '/' });
  return res;
}

export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set(COOKIE_NAME, '', { maxAge: 0, path: '/' });
  res.cookies.set(ORG_COOKIE, '', { maxAge: 0, path: '/' });
  return res;
}
