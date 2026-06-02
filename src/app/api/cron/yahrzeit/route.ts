import { NextRequest, NextResponse } from 'next/server';
import nodemailer from 'nodemailer';
import { HDate } from '@hebcal/core';
import { supabaseAdmin } from '@/lib/supabase-admin';

export const dynamic = 'force-dynamic';

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: { user: 'benamsmusic@gmail.com', pass: process.env.GMAIL_APP_PASSWORD },
});

// Appelée chaque jour par le cron Vercel. Envoie les rappels de Yahrzeit
// (le jour même et 7 jours avant).
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (secret && req.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  }

  let sent = 0;
  for (const offset of [0, 7]) {
    const target = new HDate(new Date(Date.now() + offset * 86400000));
    const month = target.getMonth();
    const day = target.getDate();

    const { data: rows } = await supabaseAdmin
      .from('yahrzeits')
      .select('name, contact_email')
      .eq('heb_month', month)
      .eq('heb_day', day);

    for (const y of rows ?? []) {
      if (!y.contact_email) continue;
      const when = offset === 0 ? "aujourd'hui" : 'dans 7 jours';
      try {
        await transporter.sendMail({
          from: '"HabadLyon" <benamsmusic@gmail.com>',
          to: y.contact_email,
          subject: `🕯️ Yahrzeit de ${y.name} — ${when}`,
          html: `<div style="font-family:Georgia,serif;max-width:480px;margin:auto;padding:24px;color:#2c1810;">
            <p style="font-size:32px;text-align:center;margin:0 0 12px;">🕯️</p>
            <p style="font-size:15px;line-height:1.7;">La Yahrzeit de <strong>${String(y.name).replace(/</g, '&lt;')}</strong> a lieu <strong>${when}</strong>.</p>
            <p style="font-size:14px;color:#6b5744;">Que son souvenir soit une bénédiction. בָּרוּךְ דַּיַּן הָאֱמֶת</p>
          </div>`,
        });
        sent++;
      } catch { /* continue */ }
    }
  }

  return NextResponse.json({ ok: true, sent });
}
