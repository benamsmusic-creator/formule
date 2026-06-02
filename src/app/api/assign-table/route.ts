import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export async function POST(req: NextRequest) {
  if (req.cookies.get('hl_admin')?.value !== 'authenticated') {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  }
  const { responseId, tableNumber } = await req.json();
  if (!responseId) return NextResponse.json({ error: 'responseId requis' }, { status: 400 });

  // Scoping par organisation
  const { data: resp } = await supabaseAdmin
    .from('responses')
    .select('id, forms(org_id)')
    .eq('id', responseId)
    .single<{ id: string; forms: { org_id: string | null } | null }>();
  if (!resp) return NextResponse.json({ error: 'Introuvable' }, { status: 404 });

  const adminOrg = req.cookies.get('hl_org')?.value;
  if (adminOrg && resp.forms?.org_id && adminOrg !== resp.forms.org_id) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 403 });
  }

  const n = tableNumber === null || tableNumber === '' ? null : parseInt(String(tableNumber), 10);
  const { error } = await supabaseAdmin
    .from('responses')
    .update({ table_number: Number.isNaN(n as number) ? null : n })
    .eq('id', responseId);
  if (error) return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  return NextResponse.json({ ok: true });
}
