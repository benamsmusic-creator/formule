import { NextRequest, NextResponse } from 'next/server';
import '@hebcal/locales';
import { HDate } from '@hebcal/core';
import { supabaseAdmin } from '@/lib/supabase-admin';

function currentOrg(req: NextRequest): string | null {
  if (req.cookies.get('hl_admin')?.value !== 'authenticated') return null;
  return req.cookies.get('hl_org')?.value || 'habadlyon';
}

export async function GET(req: NextRequest) {
  const org = currentOrg(req);
  if (!org) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  const { data } = await supabaseAdmin
    .from('birthdays')
    .select('id, name, heb_month, heb_day, greg_birth, contact_email')
    .eq('org_id', org)
    .order('heb_month', { ascending: true });
  const list = (data ?? []).map((b) => {
    let hebLabel = '';
    try { hebLabel = new HDate(b.heb_day, b.heb_month, 5785).render('fr').replace(/\s*5785/, ''); } catch { /* ignore */ }
    return { ...b, hebLabel };
  });
  return NextResponse.json(list);
}

export async function POST(req: NextRequest) {
  const org = currentOrg(req);
  if (!org) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  const { name, gregBirth, contactEmail } = await req.json();
  if (!name || !gregBirth) return NextResponse.json({ error: 'Nom et date requis.' }, { status: 400 });
  let heb_month: number, heb_day: number;
  try { const hd = new HDate(new Date(gregBirth)); heb_month = hd.getMonth(); heb_day = hd.getDate(); }
  catch { return NextResponse.json({ error: 'Date invalide.' }, { status: 400 }); }
  const { error } = await supabaseAdmin.from('birthdays').insert({
    org_id: org, name, heb_month, heb_day, greg_birth: gregBirth, contact_email: contactEmail ?? null,
  });
  if (error) return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const org = currentOrg(req);
  if (!org) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  const { id } = await req.json();
  const { error } = await supabaseAdmin.from('birthdays').delete().eq('id', id).eq('org_id', org);
  if (error) return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  return NextResponse.json({ ok: true });
}
