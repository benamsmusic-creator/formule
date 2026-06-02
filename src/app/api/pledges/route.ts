import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

function currentOrg(req: NextRequest): string | null {
  if (req.cookies.get('hl_admin')?.value !== 'authenticated') return null;
  return req.cookies.get('hl_org')?.value || 'habadlyon';
}
// Les rôles en lecture seule ne peuvent pas modifier les promesses.
function canWrite(req: NextRequest): boolean {
  const role = req.cookies.get('hl_role')?.value || null;
  return !role; // null = admin plein ; tresorier/secretaire/readonly = lecture
}

function deriveStatus(amount: number, paid: number): string {
  if (paid <= 0) return 'pending';
  if (paid >= amount) return 'paid';
  return 'partial';
}

export async function GET(req: NextRequest) {
  const org = currentOrg(req);
  if (!org) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  const { data, error } = await supabaseAdmin
    .from('pledges')
    .select('*')
    .eq('org', org)
    .order('created_at', { ascending: false });
  if (error) return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  return NextResponse.json(data ?? []);
}

export async function POST(req: NextRequest) {
  const org = currentOrg(req);
  if (!org) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  if (!canWrite(req)) return NextResponse.json({ error: 'Lecture seule' }, { status: 403 });
  const b = await req.json();
  const donorName = (b.donorName ?? '').trim();
  const amount = Number(b.amount) || 0;
  if (!donorName || amount <= 0) return NextResponse.json({ error: 'Nom et montant requis.' }, { status: 400 });
  const paid = Number(b.paidAmount) || 0;
  const { error } = await supabaseAdmin.from('pledges').insert({
    org,
    donor_name: donorName,
    donor_email: b.donorEmail || null,
    donor_phone: b.donorPhone || null,
    amount,
    paid_amount: paid,
    status: deriveStatus(amount, paid),
    reason: b.reason || null,
    due_date: b.dueDate || null,
    note: b.note || null,
  });
  if (error) return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function PATCH(req: NextRequest) {
  const org = currentOrg(req);
  if (!org) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  if (!canWrite(req)) return NextResponse.json({ error: 'Lecture seule' }, { status: 403 });
  const b = await req.json();
  if (!b.id) return NextResponse.json({ error: 'id requis' }, { status: 400 });

  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  // Mise à jour partielle de tous les champs éditables
  if (b.donorName !== undefined) patch.donor_name = b.donorName;
  if (b.donorEmail !== undefined) patch.donor_email = b.donorEmail || null;
  if (b.donorPhone !== undefined) patch.donor_phone = b.donorPhone || null;
  if (b.reason !== undefined) patch.reason = b.reason || null;
  if (b.dueDate !== undefined) patch.due_date = b.dueDate || null;
  if (b.note !== undefined) patch.note = b.note || null;

  // Recalcule le statut si montant/payé change
  if (b.amount !== undefined || b.paidAmount !== undefined || b.markPaid) {
    const { data: cur } = await supabaseAdmin.from('pledges').select('amount, paid_amount').eq('id', b.id).eq('org', org).single();
    const amount = b.amount !== undefined ? Number(b.amount) || 0 : Number(cur?.amount) || 0;
    let paid = b.paidAmount !== undefined ? Number(b.paidAmount) || 0 : Number(cur?.paid_amount) || 0;
    if (b.markPaid) paid = amount; // raccourci « tout réglé »
    patch.amount = amount;
    patch.paid_amount = paid;
    patch.status = deriveStatus(amount, paid);
  }

  const { error } = await supabaseAdmin.from('pledges').update(patch).eq('id', b.id).eq('org', org);
  if (error) return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const org = currentOrg(req);
  if (!org) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  if (!canWrite(req)) return NextResponse.json({ error: 'Lecture seule' }, { status: 403 });
  const { id } = await req.json();
  const { error } = await supabaseAdmin.from('pledges').delete().eq('id', id).eq('org', org);
  if (error) return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  return NextResponse.json({ ok: true });
}
