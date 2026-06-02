import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

function currentOrg(req: NextRequest): string | null {
  if (req.cookies.get('hl_admin')?.value !== 'authenticated') return null;
  return req.cookies.get('hl_org')?.value || 'habadlyon';
}

export async function GET(req: NextRequest) {
  const org = req.nextUrl.searchParams.get('org') || req.cookies.get('hl_org')?.value || 'habadlyon';
  const { data } = await supabaseAdmin
    .from('announcements')
    .select('id, kind, title, body, created_at')
    .eq('org_id', org)
    .order('created_at', { ascending: false })
    .limit(50);
  return NextResponse.json(data ?? []);
}

export async function POST(req: NextRequest) {
  const org = currentOrg(req);
  if (!org) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  const { kind, title, body } = await req.json();
  if (!title) return NextResponse.json({ error: 'Titre requis' }, { status: 400 });
  const k = ['info', 'mazaltov', 'urgent'].includes(kind) ? kind : 'info';
  const { error } = await supabaseAdmin.from('announcements').insert({ org_id: org, kind: k, title, body: body ?? '' });
  if (error) return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const org = currentOrg(req);
  if (!org) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  const { id } = await req.json();
  const { error } = await supabaseAdmin.from('announcements').delete().eq('id', id).eq('org_id', org);
  if (error) return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  return NextResponse.json({ ok: true });
}
