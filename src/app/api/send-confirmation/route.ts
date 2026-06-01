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
    const { to, name, phone, address, formTitle, eventDate, guestCount, paymentMethod, totalAmount, ticketId } = await req.json();

    if (!name || !formTitle) {
      return NextResponse.json({ error: 'Paramètres manquants' }, { status: 400 });
    }

    const paymentLabel =
      paymentMethod === 'card' ? '💳 Carte bancaire (payé en ligne)' :
      paymentMethod === 'cash' ? '💵 Espèces (sur place)' :
      '—';

    const paymentColor =
      paymentMethod === 'card' ? '#166534' :
      paymentMethod === 'cash' ? '#92400e' :
      '#6b5744';

    const paymentBg =
      paymentMethod === 'card' ? '#dcfce7' :
      paymentMethod === 'cash' ? '#fffbeb' :
      '#f5f0eb';

    const html = `
<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f0ebe3;font-family:'Georgia',serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f0ebe3;padding:32px 16px;">
    <tr><td align="center">
      <table width="100%" style="max-width:520px;background:#ffffff;border-radius:20px;overflow:hidden;box-shadow:0 8px 32px rgba(0,0,0,0.10);">

        <!-- Header -->
        <tr>
          <td style="background:linear-gradient(135deg,#2d1f12 0%,#4a2e18 100%);padding:28px 36px;text-align:center;">
            <p style="margin:0 0 4px;color:#c9a96e;font-size:11px;letter-spacing:2px;text-transform:uppercase;">Nouvelle inscription</p>
            <h1 style="margin:0;color:#faf8f4;font-size:24px;font-weight:300;">${formTitle}</h1>
            ${eventDate ? `<p style="margin:8px 0 0;color:#c9a96e;font-size:13px;">📅 ${eventDate}</p>` : ''}
          </td>
        </tr>

        <!-- Participant -->
        <tr>
          <td style="padding:28px 36px 0;">
            <p style="margin:0 0 16px;font-size:11px;color:#a89280;letter-spacing:1.5px;text-transform:uppercase;border-bottom:1px solid #e8e0d5;padding-bottom:8px;">Participant</p>
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td style="padding:6px 0;color:#6b5744;font-size:13px;width:40%;">Nom</td>
                <td style="padding:6px 0;color:#1a1008;font-size:14px;font-weight:600;">${name}</td>
              </tr>
              ${phone ? `<tr>
                <td style="padding:6px 0;color:#6b5744;font-size:13px;">Téléphone</td>
                <td style="padding:6px 0;color:#1a1008;font-size:14px;font-weight:600;">${phone}</td>
              </tr>` : ''}
              ${address ? `<tr>
                <td style="padding:6px 0;color:#6b5744;font-size:13px;">Adresse</td>
                <td style="padding:6px 0;color:#1a1008;font-size:14px;">${address}</td>
              </tr>` : ''}
              ${guestCount ? `<tr>
                <td style="padding:6px 0;color:#6b5744;font-size:13px;">Personnes</td>
                <td style="padding:6px 0;color:#1a1008;font-size:14px;font-weight:600;">${guestCount}</td>
              </tr>` : ''}
            </table>
          </td>
        </tr>

        <!-- Paiement -->
        <tr>
          <td style="padding:20px 36px 28px;">
            <p style="margin:0 0 12px;font-size:11px;color:#a89280;letter-spacing:1.5px;text-transform:uppercase;border-bottom:1px solid #e8e0d5;padding-bottom:8px;">Paiement</p>
            <div style="background:${paymentBg};border-radius:10px;padding:14px 18px;display:flex;align-items:center;gap:12px;">
              <p style="margin:0;color:${paymentColor};font-size:14px;font-weight:600;">${paymentLabel}</p>
              ${totalAmount ? `<p style="margin:0;color:${paymentColor};font-size:20px;font-weight:700;margin-left:auto;">${totalAmount} €</p>` : ''}
            </div>
          </td>
        </tr>

        ${ticketId ? `<!-- Billet -->
        <tr>
          <td style="padding:0 36px 28px;text-align:center;">
            <a href="https://www.habadlyon.info/billet/${ticketId}" style="display:inline-block;background:#2d1f12;color:#faf8f4;text-decoration:none;font-size:14px;font-weight:600;padding:14px 28px;border-radius:12px;">🎟️ Voir mon billet (QR code)</a>
            <p style="margin:10px 0 0;color:#a89280;font-size:11px;">À présenter à l'entrée</p>
          </td>
        </tr>` : ''}

        <!-- Footer -->
        <tr>
          <td style="background:#faf8f4;border-top:1px solid #e8e0d5;padding:16px 36px;text-align:center;">
            <p style="margin:0;color:#a89280;font-size:11px;">HabadLyon · Notification automatique</p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;

    // Adresse admin notifiée à chaque inscription (configurable, défaut = compte d'envoi)
    const adminEmail = process.env.ADMIN_NOTIFY_EMAIL || 'benamsmusic@gmail.com';
    const participantEmail = to && to !== adminEmail ? to : adminEmail;

    await transporter.sendMail({
      from: `"HabadLyon" <benamsmusic@gmail.com>`,
      to: participantEmail,
      // Copie cachée à l'admin : notifié de chaque inscription/don sans que le participant le voie
      ...(participantEmail !== adminEmail ? { bcc: adminEmail } : {}),
      subject: `✦ ${name} — ${formTitle}${totalAmount ? ` · ${totalAmount}€` : ''}`,
      html,
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[send-confirmation] Error:', err);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
