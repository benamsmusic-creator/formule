import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

function currentOrg(req: NextRequest): string | null {
  if (req.cookies.get('hl_admin')?.value !== 'authenticated') return null;
  return req.cookies.get('hl_org')?.value || 'habadlyon';
}

export async function GET(req: NextRequest) {
  const org = currentOrg(req);
  if (!org) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  const { data } = await supabaseAdmin
    .from('members')
    .select('id, name, email, phone, paid_until, family')
    .eq('org_id', org)
    .order('family', { ascending: true });
  return NextResponse.json(data ?? []);
}

export async function POST(req: NextRequest) {
  const org = currentOrg(req);
  if (!org) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  const { name, email, phone, paidUntil, family } = await req.json();
  if (!name) return NextResponse.json({ error: 'Nom requis' }, { status: 400 });
  const { error } = await supabaseAdmin.from('members').insert({
    org_id: org, name, email: email ?? '', phone: phone ?? '', paid_until: paidUntil || null, family: family ?? '',
  });
  if (error) return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function PATCH(req: NextRequest) {
  const org = currentOrg(req);
  if (!org) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  const { id, paidUntil } = await req.json();
  const { error } = await supabaseAdmin.from('members').update({ paid_until: paidUntil || null }).eq('id', id).eq('org_id', org);
  if (error) return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const org = currentOrg(req);
  if (!org) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  const { id } = await req.json();
  const { error } = await supabaseAdmin.from('members').delete().eq('id', id).eq('org_id', org);
  if (error) return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  return NextResponse.json({ ok: true });
}
