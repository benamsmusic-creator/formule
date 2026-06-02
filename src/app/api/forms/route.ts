import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { Form, FormResponse } from '@/lib/types';

function isAdmin(req: NextRequest): boolean {
  return req.cookies.get('hl_admin')?.value === 'authenticated';
}

function rowToResponse(r: Record<string, unknown>): FormResponse {
  return {
    id: r.id as string,
    formId: r.form_id as string,
    userId: r.user_id as string | undefined,
    data: r.data as Record<string, string | boolean>,
    submittedAt: r.submitted_at as string,
    paymentStatus: r.payment_status as FormResponse['paymentStatus'],
    paymentAmount: r.payment_amount as number | undefined,
    paymentMethod: r.payment_method as FormResponse['paymentMethod'],
  };
}

function rowToForm(row: Record<string, unknown>): Form {
  const responses = Array.isArray(row.responses)
    ? (row.responses as Record<string, unknown>[]).map(rowToResponse)
    : [];
  return {
    id: row.id as string,
    title: row.title as string,
    description: row.description as string | undefined,
    fields: row.fields as Form['fields'],
    coverImage: row.cover_image as string | undefined,
    youtubeUrl: row.youtube_url as string | undefined,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
    disabled: row.is_disabled as boolean | undefined,
    archived: row.is_archived as boolean | undefined,
    promoCodes: (row.promo_codes as Form['promoCodes']) ?? [],
    maxCapacity: (row.max_capacity as number | null) ?? undefined,
    responses,
  };
}

export async function GET(req: NextRequest) {
  // Contexte public : ?org=slug renvoie les formulaires de cette organisation.
  // Contexte admin : le cookie hl_org limite aux formulaires de l'admin connecté.
  // Super-admin (pas de cookie hl_org, pas de ?org) → tout.
  const org = req.nextUrl.searchParams.get('org') || req.cookies.get('hl_org')?.value;

  let query = supabaseAdmin.from('forms').select('*, responses(*)').order('created_at', { ascending: false });
  if (org) query = query.eq('org_id', org);

  const { data, error } = await query;
  if (error) return NextResponse.json([], { status: 200 });

  const json = (data ?? []).map((r) => rowToForm(r as Record<string, unknown>));
  const res = NextResponse.json(json);

  // Cache côté CDN/navigateur (#45) :
  // - Admins authentifiés → pas de cache (données sensibles, toujours fraîches)
  // - Pages publiques (gala, events) → cache 2 min, revalide en arrière-plan
  const isAdmin = req.cookies.get('hl_admin')?.value === 'authenticated';
  if (!isAdmin) {
    res.headers.set('Cache-Control', 'public, max-age=120, stale-while-revalidate=300');
  }
  return res;
}

async function logAction(org: string, action: string, detail: string) {
  try { await supabaseAdmin.from('audit_log').insert({ org_id: org, action, detail }); } catch { /* non bloquant */ }
}

export async function PATCH(req: NextRequest) {
  if (!isAdmin(req)) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  const { id, ...updates } = await req.json();
  const org = req.cookies.get('hl_org')?.value || 'habadlyon';
  const dbUpdates: Record<string, unknown> = {};
  if ('is_disabled' in updates) dbUpdates.is_disabled = updates.is_disabled;
  if ('is_archived' in updates) dbUpdates.is_archived = updates.is_archived;
  const { error } = await supabaseAdmin.from('forms').update(dbUpdates).eq('id', id);
  if (error) return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  let label = 'Formulaire modifié';
  if ('is_archived' in updates) label = updates.is_archived ? 'Formulaire archivé' : 'Formulaire restauré';
  else if ('is_disabled' in updates) label = updates.is_disabled ? 'Formulaire désactivé' : 'Formulaire réactivé';
  await logAction(org, label, id);
  return NextResponse.json({ ok: true });
}

export async function POST(req: NextRequest) {
  if (!isAdmin(req)) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  }
  const form: Form = await req.json();
  // Organisation propriétaire : celle de l'admin connecté, sinon 'habadlyon' (super-admin)
  const org = req.cookies.get('hl_org')?.value || 'habadlyon';
  const { error } = await supabaseAdmin.from('forms').upsert({
    id: form.id,
    title: form.title,
    description: form.description ?? '',
    fields: form.fields,
    cover_image: form.coverImage ?? null,
    youtube_url: form.youtubeUrl ?? null,
    promo_codes: form.promoCodes ?? [],
    max_capacity: form.maxCapacity ?? null,
    org_id: org,
    created_at: form.createdAt,
    updated_at: new Date().toISOString(),
  });
  if (error) return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  await logAction(org, 'Formulaire enregistré', form.title);
  return NextResponse.json(form);
}

export async function DELETE(req: NextRequest) {
  if (!isAdmin(req)) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  }
  const { id } = await req.json();
  const org = req.cookies.get('hl_org')?.value || 'habadlyon';
  const { error } = await supabaseAdmin.from('forms').delete().eq('id', id);
  if (error) return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  await logAction(org, 'Formulaire supprimé', id);
  return NextResponse.json({ ok: true });
}
