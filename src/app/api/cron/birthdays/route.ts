import { NextRequest, NextResponse } from 'next/server';
import nodemailer from 'nodemailer';
import { HDate } from '@hebcal/core';
import { supabaseAdmin } from '@/lib/supabase-admin';

export const dynamic = 'force-dynamic';

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: { user: 'benamsmusic@gmail.com', pass: process.env.GMAIL_APP_PASSWORD },
});

export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (secret && req.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  }

  const today = new HDate(new Date());
  const { data: rows } = await supabaseAdmin
    .from('birthdays')
    .select('name, contact_email')
    .eq('heb_month', today.getMonth())
    .eq('heb_day', today.getDate());

  let sent = 0;
  for (const b of rows ?? []) {
    if (!b.contact_email) continue;
    try {
      await transporter.sendMail({
        from: '"HabadLyon" <benamsmusic@gmail.com>',
        to: b.contact_email,
        subject: `🎂 Joyeux anniversaire ${b.name} !`,
        html: `<div style="font-family:Georgia,serif;max-width:480px;margin:auto;padding:24px;color:#2c1810;text-align:center;">
          <p style="font-size:40px;margin:0 0 12px;">🎂</p>
          <p style="font-size:18px;">Joyeux anniversaire hébraïque, <strong>${String(b.name).replace(/</g, '&lt;')}</strong> !</p>
          <p style="font-size:14px;color:#6b5744;">עד מאה ועשרים שנה — Jusqu'à 120 ans !</p>
        </div>`,
      });
      sent++;
    } catch { /* continue */ }
  }
  return NextResponse.json({ ok: true, sent });
}
