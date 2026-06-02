import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

function isAdmin(req: NextRequest) {
  return req.cookies.get('hl_admin')?.value === 'authenticated';
}
function isReadonly(req: NextRequest) {
  return req.cookies.get('hl_role')?.value === 'readonly';
}

// Admin : supprimer/annuler une inscription (#71)
export async function DELETE(req: NextRequest) {
  if (!isAdmin(req)) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  if (isReadonly(req)) return NextResponse.json({ error: 'Accès lecture seule' }, { status: 403 });

  const { responseId } = await req.json();
  if (!responseId) return NextResponse.json({ error: 'responseId manquant' }, { status: 400 });

  const { error } = await supabaseAdmin.from('responses').delete().eq('id', responseId);
  if (error) return NextResponse.json({ error: 'Erreur lors de la suppression' }, { status: 500 });

  return NextResponse.json({ ok: true });
}
