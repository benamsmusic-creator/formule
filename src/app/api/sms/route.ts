import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

function currentOrg(req: NextRequest): string | null {
  if (req.cookies.get('hl_admin')?.value !== 'authenticated') return null;
  return req.cookies.get('hl_org')?.value || 'habadlyon';
}

// Normalise un numéro FR en format international (+33...).
function normalizePhone(raw: string): string | null {
  const p = (raw || '').replace(/[\s.\-()]/g, '');
  if (/^\+\d{8,15}$/.test(p)) return p;
  if (/^0\d{9}$/.test(p)) return '+33' + p.slice(1);
  return null;
}

// Admin : nombre de destinataires (membres avec téléphone) + état de config
export async function GET(req: NextRequest) {
  const org = currentOrg(req);
  if (!org) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  const { data } = await supabaseAdmin.from('members').select('phone').eq('org_id', org);
  const count = (data ?? []).filter((m) => normalizePhone(m.phone)).length;
  return NextResponse.json({ count, configured: !!process.env.BREVO_API_KEY });
}

// Admin : envoie un SMS à tous les membres (avec téléphone) de l'organisation
export async function POST(req: NextRequest) {
  const org = currentOrg(req);
  if (!org) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });

  const apiKey = process.env.BREVO_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'Clé Brevo non configurée. Ajoutez BREVO_API_KEY dans les variables Vercel.' }, { status: 400 });
  }

  const { message } = await req.json();
  if (!message || String(message).trim().length === 0) {
    return NextResponse.json({ error: 'Message requis' }, { status: 400 });
  }

  const { data: orgRow } = await supabaseAdmin.from('organizations').select('name').eq('id', org).single();
  const sender = (orgRow?.name ?? 'HabadLyon').replace(/[^a-zA-Z0-9]/g, '').slice(0, 11) || 'HabadLyon';

  const { data: members } = await supabaseAdmin.from('members').select('phone').eq('org_id', org);
  const phones = [...new Set((members ?? []).map((m) => normalizePhone(m.phone)).filter(Boolean) as string[])];
  if (phones.length === 0) return NextResponse.json({ error: 'Aucun numéro valide.' }, { status: 400 });

  let sent = 0;
  for (const phone of phones) {
    try {
      const res = await fetch('https://api.brevo.com/v3/transactionalSMS/sms', {
        method: 'POST',
        headers: { 'api-key': apiKey, 'Content-Type': 'application/json', accept: 'application/json' },
        body: JSON.stringify({ type: 'transactional', unicodeEnabled: true, sender, recipient: phone, content: String(message).slice(0, 480) }),
      });
      if (res.ok) sent++;
    } catch { /* continue */ }
  }

  return NextResponse.json({ ok: true, sent, total: phones.length });
}
