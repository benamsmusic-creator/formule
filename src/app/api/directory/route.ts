import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

function currentOrg(req: NextRequest): string | null {
  if (req.cookies.get('hl_admin')?.value !== 'authenticated') return null;
  return req.cookies.get('hl_org')?.value || 'habadlyon';
}

export async function GET(req: NextRequest) {
  const org = req.nextUrl.searchParams.get('org') || req.cookies.get('hl_org')?.value || 'habadlyon';
  const { data } = await supabaseAdmin
    .from('directory')
    .select('id, category, name, address, phone, url')
    .eq('org_id', org)
    .order('category', { ascending: true });
  return NextResponse.json(data ?? []);
}

export async function POST(req: NextRequest) {
  const org = currentOrg(req);
  if (!org) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  const { category, name, address, phone, url } = await req.json();
  if (!name) return NextResponse.json({ error: 'Nom requis' }, { status: 400 });
  const { error } = await supabaseAdmin.from('directory').insert({
    org_id: org, category: category || 'Autre', name, address: address ?? '', phone: phone ?? '', url: url ?? '',
  });
  if (error) return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const org = currentOrg(req);
  if (!org) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  const { id } = await req.json();
  const { error } = await supabaseAdmin.from('directory').delete().eq('id', id).eq('org_id', org);
  if (error) return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  return NextResponse.json({ ok: true });
}
