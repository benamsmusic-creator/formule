import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

// Public : un membre s'abonne à la newsletter d'une organisation.
export async function POST(req: NextRequest) {
  const { org, email } = await req.json();
  const slug = String(org || '').trim();
  const mail = String(email || '').toLowerCase().trim();

  if (!slug || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(mail)) {
    return NextResponse.json({ error: 'Email invalide.' }, { status: 400 });
  }

  // upsert silencieux (déjà abonné = OK)
  const { error } = await supabaseAdmin
    .from('subscribers')
    .upsert({ org_id: slug, email: mail }, { onConflict: 'org_id,email' });

  if (error) return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  return NextResponse.json({ ok: true });
}
