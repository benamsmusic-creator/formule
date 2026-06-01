import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export async function POST(req: NextRequest) {
  if (req.cookies.get('hl_admin')?.value !== 'authenticated') {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  }

  const { responseId, value } = await req.json();
  if (!responseId) return NextResponse.json({ error: 'responseId requis' }, { status: 400 });

  // Récupère la réponse + l'org de son formulaire (pour le scoping)
  const { data: resp } = await supabaseAdmin
    .from('responses')
    .select('id, forms(org_id)')
    .eq('id', responseId)
    .single<{ id: string; forms: { org_id: string | null } | null }>();

  if (!resp) return NextResponse.json({ error: 'Introuvable' }, { status: 404 });

  // Un admin d'org ne peut pointer que ses propres inscrits
  const adminOrg = req.cookies.get('hl_org')?.value;
  const respOrg = resp.forms?.org_id;
  if (adminOrg && respOrg && adminOrg !== respOrg) {
    return NextResponse.json({ error: 'Non autorisé pour cette organisation' }, { status: 403 });
  }

  const checked = !!value;
  const { error } = await supabaseAdmin
    .from('responses')
    .update({ checked_in: checked, checked_in_at: checked ? new Date().toISOString() : null })
    .eq('id', responseId);

  if (error) return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  return NextResponse.json({ ok: true, checked });
}
