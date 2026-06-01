import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { supabaseAdmin } from '@/lib/supabase-admin';

const COOKIE_MAX_AGE = 60 * 60 * 24 * 30;
const RESERVED = new Set([
  'habadlyon', 'api', 'dashboard', 'builder', 'login', 'clients', 'events', 'don',
  'horaires', 'infos', 'compte', 'register', 'user-login', 'forms', 'billet', 'signup',
  'admin', 'www', 'robots.txt', 'sitemap.xml', 'manifest.webmanifest', 'opengraph-image',
  'favicon.ico', '_next', 'public',
]);

function cookieOpts() {
  return { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax' as const, maxAge: COOKIE_MAX_AGE, path: '/' };
}

export async function POST(req: NextRequest) {
  const { orgId, orgName, adminEmail, adminPassword, adminName } = await req.json();
  const slug = String(orgId || '').toLowerCase().trim().replace(/[^a-z0-9-]/g, '-').replace(/^-+|-+$/g, '');

  if (!slug || slug.length < 3 || !orgName || !adminEmail || !adminPassword) {
    return NextResponse.json({ error: 'Tous les champs sont requis (identifiant ≥ 3 caractères).' }, { status: 400 });
  }
  if (RESERVED.has(slug)) {
    return NextResponse.json({ error: 'Cet identifiant est réservé, choisissez-en un autre.' }, { status: 400 });
  }
  if (String(adminPassword).length < 6) {
    return NextResponse.json({ error: 'Le mot de passe doit faire au moins 6 caractères.' }, { status: 400 });
  }

  const { error: orgErr } = await supabaseAdmin.from('organizations').insert({ id: slug, name: orgName });
  if (orgErr) {
    return NextResponse.json({ error: 'Cet identifiant de communauté est déjà pris.' }, { status: 400 });
  }

  const password_hash = await bcrypt.hash(String(adminPassword), 10);
  const { error: adminErr } = await supabaseAdmin.from('admins').insert({
    email: String(adminEmail).toLowerCase().trim(), password_hash, org_id: slug, name: adminName ?? '',
  });
  if (adminErr) {
    await supabaseAdmin.from('organizations').delete().eq('id', slug);
    return NextResponse.json({ error: 'Cet email est déjà utilisé.' }, { status: 400 });
  }

  // Page de don clé en main
  await supabaseAdmin.from('forms').upsert({
    id: `dons-${slug}`,
    title: 'Faire un don',
    description: `Soutenez ${orgName}. Votre don, petit ou grand, fait la différence.`,
    fields: [{ id: 'don_field', type: 'donation', label: 'Votre don', required: true, suggestedAmounts: [18, 36, 180, 360], allowCustomAmount: true, allowCash: false }],
    is_disabled: false, is_archived: false, org_id: slug,
    created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
  });

  // Connexion automatique
  const res = NextResponse.json({ ok: true, org: slug });
  res.cookies.set('hl_admin', 'authenticated', cookieOpts());
  res.cookies.set('hl_org', slug, cookieOpts());
  return res;
}
