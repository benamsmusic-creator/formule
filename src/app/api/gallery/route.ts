import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

function currentOrg(req: NextRequest): string | null {
  if (req.cookies.get('hl_admin')?.value !== 'authenticated') return null;
  return req.cookies.get('hl_org')?.value || 'habadlyon';
}

// Public : liste des photos d'une organisation (?org=slug)
export async function GET(req: NextRequest) {
  const org = req.nextUrl.searchParams.get('org') || req.cookies.get('hl_org')?.value || 'habadlyon';
  const { data } = await supabaseAdmin
    .from('gallery_photos')
    .select('id, url, caption, created_at')
    .eq('org_id', org)
    .order('created_at', { ascending: false });
  return NextResponse.json(data ?? []);
}

// Admin : ajoute une photo
export async function POST(req: NextRequest) {
  const org = currentOrg(req);
  if (!org) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  const { url, caption } = await req.json();
  if (!url) return NextResponse.json({ error: 'url requise' }, { status: 400 });
  const { error } = await supabaseAdmin.from('gallery_photos').insert({ org_id: org, url, caption: caption ?? '' });
  if (error) return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  return NextResponse.json({ ok: true });
}

// Admin : supprime une photo (uniquement de son org)
export async function DELETE(req: NextRequest) {
  const org = currentOrg(req);
  if (!org) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  const { id } = await req.json();
  if (!id) return NextResponse.json({ error: 'id requis' }, { status: 400 });
  const { error } = await supabaseAdmin.from('gallery_photos').delete().eq('id', id).eq('org_id', org);
  if (error) return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  return NextResponse.json({ ok: true });
}
