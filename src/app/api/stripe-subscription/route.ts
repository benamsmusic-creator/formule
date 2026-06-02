import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';

// Dons récurrents (mensuels) via Stripe Checkout en mode abonnement.
// DÉSACTIVÉ par défaut : nécessite ENABLE_RECURRING=1 (à activer après test).
export async function POST(req: NextRequest) {
  if (process.env.ENABLE_RECURRING !== '1') {
    return NextResponse.json({ error: 'Les dons récurrents ne sont pas encore activés.' }, { status: 400 });
  }
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return NextResponse.json({ error: 'Stripe non configuré.' }, { status: 500 });

  const stripe = new Stripe(key);
  const { amount } = await req.json();
  const cents = Math.round(Number(amount) * 100);
  if (!cents || cents < 100) return NextResponse.json({ error: 'Montant minimum 1 €.' }, { status: 400 });

  const origin = req.headers.get('origin') || 'https://www.habadlyon.info';
  try {
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      line_items: [{
        quantity: 1,
        price_data: {
          currency: 'eur',
          recurring: { interval: 'month' },
          product_data: { name: 'Don mensuel — HabadLyon' },
          unit_amount: cents,
        },
      }],
      success_url: `${origin}/?don=merci`,
      cancel_url: `${origin}/don-mensuel`,
    });
    return NextResponse.json({ url: session.url });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Erreur Stripe' }, { status: 500 });
  }
}
