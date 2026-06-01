import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { Form, FormResponse } from '@/lib/types';

function rowToForm(row: Record<string, unknown>): Form {
  const responses = Array.isArray(row.responses)
    ? (row.responses as Record<string, unknown>[]).map((r) => ({
        id: r.id as string,
        formId: r.form_id as string,
        userId: r.user_id as string | undefined,
        data: r.data as Record<string, string | boolean>,
        submittedAt: r.submitted_at as string,
        paymentStatus: r.payment_status as FormResponse['paymentStatus'],
        paymentAmount: r.payment_amount as number | undefined,
        paymentMethod: r.payment_method as FormResponse['paymentMethod'],
      }))
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

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { data, error } = await supabaseAdmin
    .from('forms')
    .select('*, responses(*)')
    .eq('id', id)
    .single();

  if (error || !data) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const form = rowToForm(data as Record<string, unknown>);
  // Couleur d'accent de l'organisation propriétaire (white-label)
  const orgId = (data as Record<string, unknown>).org_id as string | null;
  if (orgId) {
    const { data: org } = await supabaseAdmin.from('organizations').select('accent_color').eq('id', orgId).single();
    if (org?.accent_color) form.accentColor = org.accent_color as string;
  }
  return NextResponse.json(form);
}
