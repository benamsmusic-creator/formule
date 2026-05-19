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
  const responses = Array.isArray(row.form_responses)
    ? (row.form_responses as Record<string, unknown>[]).map(rowToResponse)
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
    responses,
  };
}

export async function GET() {
  const { data, error } = await supabaseAdmin
    .from('forms')
    .select('*, form_responses(*)')
    .order('created_at', { ascending: false });

  if (error) return NextResponse.json([], { status: 200 });
  return NextResponse.json((data ?? []).map((r) => rowToForm(r as Record<string, unknown>)));
}

export async function POST(req: NextRequest) {
  if (!isAdmin(req)) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  }
  const form: Form = await req.json();
  const { error } = await supabaseAdmin.from('forms').upsert({
    id: form.id,
    title: form.title,
    description: form.description ?? '',
    fields: form.fields,
    cover_image: form.coverImage ?? null,
    youtube_url: form.youtubeUrl ?? null,
    created_at: form.createdAt,
    updated_at: new Date().toISOString(),
  });
  if (error) return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  return NextResponse.json(form);
}

export async function DELETE(req: NextRequest) {
  if (!isAdmin(req)) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  }
  const { id } = await req.json();
  const { error } = await supabaseAdmin.from('forms').delete().eq('id', id);
  if (error) return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  return NextResponse.json({ ok: true });
}
