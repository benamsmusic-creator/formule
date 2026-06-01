import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

// Organisation gérée par l'utilisateur connecté : son org (admin) ou 'habadlyon' (super-admin).
function currentOrg(req: NextRequest): string | null {
  const auth = req.cookies.get('hl_admin')?.value === 'authenticated';
  if (!auth) return null;
  return req.cookies.get('hl_org')?.value || 'habadlyon';
}

export async function GET(req: NextRequest) {
  const org = currentOrg(req);
  if (!org) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  const { data } = await supabaseAdmin.from('organizations').select('id, name, accent_color').eq('id', org).single();
  return NextResponse.json(data ?? {});
}

export async function POST(req: NextRequest) {
  const org = currentOrg(req);
  if (!org) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });

  const { name, accentColor } = await req.json();
  const updates: Record<string, string> = {};
  if (typeof name === 'string' && name.trim()) updates.name = name.trim();
  if (typeof accentColor === 'string' && /^#[0-9a-fA-F]{6}$/.test(accentColor)) updates.accent_color = accentColor;

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'Aucune modification valide.' }, { status: 400 });
  }

  const { error } = await supabaseAdmin.from('organizations').update(updates).eq('id', org);
  if (error) return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  return NextResponse.json({ ok: true });
}
