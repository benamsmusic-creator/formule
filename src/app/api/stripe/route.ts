import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';

const stripeSecretKey = process.env.STRIPE_SECRET_KEY;

export async function POST(req: NextRequest) {
  if (!stripeSecretKey) {
    return NextResponse.json({ error: 'Stripe non configuré. Ajoutez STRIPE_SECRET_KEY dans .env.local' }, { status: 500 });
  }

  const stripe = new Stripe(stripeSecretKey);

  try {
    const { amount, currency = 'eur', description } = await req.json();

    const amountInCents = Math.round(amount * 100);
    if (!amount || amountInCents < 50) {
      return NextResponse.json({ error: 'Montant invalide (minimum 0.50€)' }, { status: 400 });
    }

    const paymentIntent = await stripe.paymentIntents.create({
      amount: amountInCents,
      currency,
      description: description ?? 'Paiement HabadLyon',
      automatic_payment_methods: { enabled: true },
    });

    return NextResponse.json({ clientSecret: paymentIntent.client_secret });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erreur inconnue';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
