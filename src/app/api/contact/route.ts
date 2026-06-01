import { NextRequest, NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'benamsmusic@gmail.com',
    pass: process.env.GMAIL_APP_PASSWORD,
  },
});

export async function POST(req: NextRequest) {
  try {
    const { name, email, message } = await req.json();

    if (!name || !email || !message) {
      return NextResponse.json({ error: 'Tous les champs sont requis.' }, { status: 400 });
    }
    if (typeof message !== 'string' || message.length > 5000) {
      return NextResponse.json({ error: 'Message invalide.' }, { status: 400 });
    }

    const adminEmail = process.env.ADMIN_NOTIFY_EMAIL || 'benamsmusic@gmail.com';
    const esc = (s: string) => String(s).replace(/</g, '&lt;').replace(/>/g, '&gt;');

    await transporter.sendMail({
      from: `"HabadLyon — Contact" <benamsmusic@gmail.com>`,
      to: adminEmail,
      replyTo: email,
      subject: `✉️ Message de ${esc(name)}`,
      html: `
        <div style="font-family:Georgia,serif;max-width:520px;margin:auto;background:#fff;border-radius:16px;overflow:hidden;border:1px solid #e8e0d5;">
          <div style="background:linear-gradient(135deg,#2d1f12,#4a2e18);padding:24px 32px;color:#faf8f4;">
            <p style="margin:0 0 4px;color:#c9a96e;font-size:11px;letter-spacing:2px;text-transform:uppercase;">Nouveau message</p>
            <h1 style="margin:0;font-size:22px;font-weight:300;">${esc(name)}</h1>
          </div>
          <div style="padding:24px 32px;color:#2c1810;font-size:14px;line-height:1.6;">
            <p style="margin:0 0 12px;color:#6b5744;">Email : <a href="mailto:${esc(email)}">${esc(email)}</a></p>
            <p style="margin:0;white-space:pre-wrap;">${esc(message)}</p>
          </div>
        </div>`,
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[contact] Error:', err);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
