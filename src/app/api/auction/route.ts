import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

function currentOrg(req: NextRequest): string | null {
  if (req.cookies.get('hl_admin')?.value !== 'authenticated') return null;
  return req.cookies.get('hl_org')?.value || 'habadlyon';
}

// Public : liste des enchères
export async function GET(req: NextRequest) {
  const org = req.nextUrl.searchParams.get('org') || req.cookies.get('hl_org')?.value || 'habadlyon';
  const { data } = await supabaseAdmin
    .from('auction_items')
    .select('id, title, current_bid, current_bidder, closed')
    .eq('org_id', org)
    .order('created_at', { ascending: true });
  return NextResponse.json(data ?? []);
}

// Admin : crée une enchère
export async function POST(req: NextRequest) {
  const org = currentOrg(req);
  if (!org) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  const { title } = await req.json();
  if (!title) return NextResponse.json({ error: 'Titre requis' }, { status: 400 });
  const { error } = await supabaseAdmin.from('auction_items').insert({ org_id: org, title });
  if (error) return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  return NextResponse.json({ ok: true });
}

// Public : placer une enchère (doit dépasser l'offre actuelle)
export async function PATCH(req: NextRequest) {
  const { itemId, name, amount } = await req.json();
  const bid = parseFloat(String(amount));
  if (!itemId || !name || Number.isNaN(bid)) return NextResponse.json({ error: 'Champs invalides' }, { status: 400 });

  const { data: item } = await supabaseAdmin
    .from('auction_items')
    .select('current_bid, closed')
    .eq('id', itemId)
    .single<{ current_bid: number; closed: boolean }>();
  if (!item) return NextResponse.json({ error: 'Introuvable' }, { status: 404 });
  if (item.closed) return NextResponse.json({ error: 'Enchère clôturée' }, { status: 400 });
  if (bid <= (item.current_bid ?? 0)) {
    return NextResponse.json({ error: `L'offre doit dépasser ${item.current_bid} €.` }, { status: 400 });
  }

  const { error } = await supabaseAdmin
    .from('auction_items')
    .update({ current_bid: bid, current_bidder: String(name).slice(0, 80) })
    .eq('id', itemId);
  if (error) return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  return NextResponse.json({ ok: true, current_bid: bid });
}

// Admin : clôture/supprime
export async function DELETE(req: NextRequest) {
  const org = currentOrg(req);
  if (!org) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  const { id } = await req.json();
  const { error } = await supabaseAdmin.from('auction_items').delete().eq('id', id).eq('org_id', org);
  if (error) return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  return NextResponse.json({ ok: true });
}
