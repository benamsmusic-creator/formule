import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { supabaseAdmin } from '@/lib/supabase-admin';

// Seul le super-admin (cookie hl_admin sans hl_org) gère les clients.
function isSuperAdmin(req: NextRequest): boolean {
  return req.cookies.get('hl_admin')?.value === 'authenticated' && !req.cookies.get('hl_org')?.value;
}

export async function GET(req: NextRequest) {
  if (!isSuperAdmin(req)) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });

  const { data: orgs } = await supabaseAdmin
    .from('organizations')
    .select('id, name, created_at')
    .order('created_at', { ascending: false });

  const { data: admins } = await supabaseAdmin.from('admins').select('email, org_id, name');

  const list = (orgs ?? []).map((o) => ({
    ...o,
    admins: (admins ?? []).filter((a) => a.org_id === o.id),
  }));
  return NextResponse.json(list);
}

export async function POST(req: NextRequest) {
  if (!isSuperAdmin(req)) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });

  const { orgId, orgName, adminEmail, adminPassword, adminName } = await req.json();
  const slug = String(orgId || '').toLowerCase().trim().replace(/[^a-z0-9-]/g, '-');

  if (!slug || !orgName || !adminEmail || !adminPassword) {
    return NextResponse.json({ error: 'Champs requis manquants.' }, { status: 400 });
  }
  if (String(adminPassword).length < 6) {
    return NextResponse.json({ error: 'Le mot de passe doit faire au moins 6 caractères.' }, { status: 400 });
  }

  // Organisation
  const { error: orgErr } = await supabaseAdmin
    .from('organizations')
    .insert({ id: slug, name: orgName });
  if (orgErr) {
    return NextResponse.json({ error: 'Cette organisation existe déjà ou est invalide.' }, { status: 400 });
  }

  // Compte admin
  const password_hash = await bcrypt.hash(String(adminPassword), 10);
  const { error: adminErr } = await supabaseAdmin.from('admins').insert({
    email: String(adminEmail).toLowerCase().trim(),
    password_hash,
    org_id: slug,
    name: adminName ?? '',
  });
  if (adminErr) {
    // rollback de l'organisation si l'admin échoue (email déjà pris)
    await supabaseAdmin.from('organizations').delete().eq('id', slug);
    return NextResponse.json({ error: 'Cet email admin est déjà utilisé.' }, { status: 400 });
  }

  return NextResponse.json({ ok: true, org: slug });
}
