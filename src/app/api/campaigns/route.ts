import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

function currentOrg(req: NextRequest): string | null {
  if (req.cookies.get('hl_admin')?.value !== 'authenticated') return null;
  return req.cookies.get('hl_org')?.value || 'habadlyon';
}
function canWrite(req: NextRequest): boolean {
  return !(req.cookies.get('hl_role')?.value || null);
}
function slugify(s: string): string {
  return s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 50) || 'cagnotte';
}

// Calcule le total collecté (dons en ligne + hors-ligne) pour des cagnottes.
async function raisedMap(ids: string[]): Promise<Record<string, number>> {
  const map: Record<string, number> = {};
  if (ids.length === 0) return map;
  const { data } = await supabaseAdmin.from('campaign_donations').select('campaign_id, amount').in('campaign_id', ids);
  for (const d of data ?? []) map[d.campaign_id] = (map[d.campaign_id] || 0) + (Number(d.amount) || 0);
  return map;
}

export async function GET(req: NextRequest) {
  const slug = req.nextUrl.searchParams.get('slug');

  // ─── Accès public : une cagnotte par slug ───
  if (slug) {
    const org = req.nextUrl.searchParams.get('org') || 'habadlyon';
    const { data: c } = await supabaseAdmin.from('campaigns').select('*').eq('org', org).eq('slug', slug).single();
    if (!c) return NextResponse.json({ error: 'Introuvable' }, { status: 404 });
    const { data: dons } = await supabaseAdmin.from('campaign_donations')
      .select('donor_name, amount, message, anonymous, created_at').eq('campaign_id', c.id)
      .order('created_at', { ascending: false }).limit(50);
    const online = (dons ?? []).reduce((s, d) => s + (Number(d.amount) || 0), 0);
    const raised = online + (Number(c.raised_offline) || 0);
    const donors = (dons ?? []).map((d) => ({
      name: d.anonymous ? 'Anonyme' : (d.donor_name || 'Anonyme'),
      amount: Number(d.amount) || 0, message: d.message || null, at: d.created_at,
    }));
    return NextResponse.json({
      id: c.id, slug: c.slug, title: c.title, description: c.description,
      goalAmount: Number(c.goal_amount) || 0, raised, status: c.status, coverUrl: c.cover_url,
      donorCount: donors.length, donors,
    });
  }

  // ─── Admin : liste ───
  const org = currentOrg(req);
  if (!org) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  const { data, error } = await supabaseAdmin.from('campaigns').select('*').eq('org', org).order('created_at', { ascending: false });
  if (error) return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  const ids = (data ?? []).map((c) => c.id);
  const rmap = await raisedMap(ids);
  const list = (data ?? []).map((c) => ({
    ...c,
    raised: (rmap[c.id] || 0) + (Number(c.raised_offline) || 0),
  }));
  return NextResponse.json(list);
}

export async function POST(req: NextRequest) {
  const org = currentOrg(req);
  if (!org) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  if (!canWrite(req)) return NextResponse.json({ error: 'Lecture seule' }, { status: 403 });
  const b = await req.json();
  const title = (b.title ?? '').trim();
  if (!title) return NextResponse.json({ error: 'Titre requis.' }, { status: 400 });

  // slug unique dans l'org
  const base = b.slug ? slugify(b.slug) : slugify(title);
  let slug = base, n = 1;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const { data: exists } = await supabaseAdmin.from('campaigns').select('id').eq('org', org).eq('slug', slug).maybeSingle();
    if (!exists) break;
    slug = `${base}-${++n}`;
  }

  const { data, error } = await supabaseAdmin.from('campaigns').insert({
    org, slug, title,
    description: b.description || null,
    goal_amount: Number(b.goalAmount) || 0,
    cover_url: b.coverUrl || null,
    status: 'active',
  }).select('slug').single();
  if (error) return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  return NextResponse.json({ ok: true, slug: data?.slug });
}

export async function PATCH(req: NextRequest) {
  const org = currentOrg(req);
  if (!org) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  if (!canWrite(req)) return NextResponse.json({ error: 'Lecture seule' }, { status: 403 });
  const b = await req.json();
  if (!b.id) return NextResponse.json({ error: 'id requis' }, { status: 400 });

  // Ajout d'un don hors-ligne (espèces/chèque) → enregistré comme donation source offline
  if (b.addOffline && Number(b.addOffline) > 0) {
    await supabaseAdmin.from('campaign_donations').insert({
      campaign_id: b.id, org, donor_name: b.offlineName || 'Don hors-ligne',
      amount: Number(b.addOffline), source: 'offline',
    });
    return NextResponse.json({ ok: true });
  }

  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (b.title !== undefined) patch.title = b.title;
  if (b.description !== undefined) patch.description = b.description || null;
  if (b.goalAmount !== undefined) patch.goal_amount = Number(b.goalAmount) || 0;
  if (b.coverUrl !== undefined) patch.cover_url = b.coverUrl || null;
  if (b.status !== undefined) patch.status = b.status;
  const { error } = await supabaseAdmin.from('campaigns').update(patch).eq('id', b.id).eq('org', org);
  if (error) return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const org = currentOrg(req);
  if (!org) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  if (!canWrite(req)) return NextResponse.json({ error: 'Lecture seule' }, { status: 403 });
  const { id } = await req.json();
  const { error } = await supabaseAdmin.from('campaigns').delete().eq('id', id).eq('org', org);
  if (error) return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  return NextResponse.json({ ok: true });
}
