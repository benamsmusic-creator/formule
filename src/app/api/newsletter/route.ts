import { NextRequest, NextResponse } from 'next/server';
import nodemailer from 'nodemailer';
import { supabaseAdmin } from '@/lib/supabase-admin';

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: { user: 'benamsmusic@gmail.com', pass: process.env.GMAIL_APP_PASSWORD },
});

function currentOrg(req: NextRequest): string | null {
  if (req.cookies.get('hl_admin')?.value !== 'authenticated') return null;
  return req.cookies.get('hl_org')?.value || 'habadlyon';
}

// Admin : nombre d'abonnés de son organisation
export async function GET(req: NextRequest) {
  const org = currentOrg(req);
  if (!org) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  const { count } = await supabaseAdmin
    .from('subscribers')
    .select('id', { count: 'exact', head: true })
    .eq('org_id', org);
  return NextResponse.json({ count: count ?? 0 });
}

// Admin : envoie une newsletter à tous les abonnés de son organisation (en BCC)
export async function POST(req: NextRequest) {
  const org = currentOrg(req);
  if (!org) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });

  const { subject, message } = await req.json();
  if (!subject || !message) return NextResponse.json({ error: 'Sujet et message requis.' }, { status: 400 });

  const { data: subs } = await supabaseAdmin.from('subscribers').select('email').eq('org_id', org);
  const emails = (subs ?? []).map((s) => s.email);
  if (emails.length === 0) return NextResponse.json({ error: 'Aucun abonné.' }, { status: 400 });

  const { data: orgRow } = await supabaseAdmin.from('organizations').select('name').eq('id', org).single();
  const orgName = orgRow?.name ?? 'HabadLyon';
  const esc = (s: string) => String(s).replace(/</g, '&lt;').replace(/>/g, '&gt;');

  const html = `
    <div style="font-family:Georgia,serif;max-width:560px;margin:auto;background:#fff;border-radius:16px;overflow:hidden;border:1px solid #e8e0d5;">
      <div style="background:linear-gradient(135deg,#2d1f12,#4a2e18);padding:24px 32px;color:#faf8f4;">
        <h1 style="margin:0;font-size:22px;font-weight:300;">${esc(orgName)}</h1>
      </div>
      <div style="padding:24px 32px;color:#2c1810;font-size:15px;line-height:1.7;white-space:pre-wrap;">${esc(message)}</div>
      <div style="background:#faf8f4;border-top:1px solid #e8e0d5;padding:14px 32px;text-align:center;color:#a89280;font-size:11px;">${esc(orgName)} · Newsletter</div>
    </div>`;

  await transporter.sendMail({
    from: `"${orgName}" <benamsmusic@gmail.com>`,
    to: 'benamsmusic@gmail.com',
    bcc: emails,
    subject,
    html,
  });

  return NextResponse.json({ ok: true, sent: emails.length });
}
