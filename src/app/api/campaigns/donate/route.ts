import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

// Public : enregistre un don en ligne après paiement Stripe réussi.
export async function POST(req: NextRequest) {
  const b = await req.json();
  const org = b.org || 'habadlyon';
  const slug = b.slug;
  const amount = Number(b.amount) || 0;
  if (!slug || amount <= 0) return NextResponse.json({ error: 'Données invalides.' }, { status: 400 });

  const { data: c } = await supabaseAdmin.from('campaigns').select('id, status').eq('org', org).eq('slug', slug).single();
  if (!c) return NextResponse.json({ error: 'Cagnotte introuvable.' }, { status: 404 });
  if (c.status !== 'active') return NextResponse.json({ error: 'Cagnotte clôturée.' }, { status: 400 });

  const { error } = await supabaseAdmin.from('campaign_donations').insert({
    campaign_id: c.id,
    org,
    donor_name: (b.donorName || '').trim() || null,
    donor_email: b.donorEmail || null,
    amount,
    message: (b.message || '').trim() || null,
    anonymous: !!b.anonymous,
    source: 'online',
  });
  if (error) return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  return NextResponse.json({ ok: true });
}
