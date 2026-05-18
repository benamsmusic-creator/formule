'use client';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';

const stripePublicKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
const stripePromise = stripePublicKey ? loadStripe(stripePublicKey) : null;

function CheckoutForm({ amount, onSuccess }: { amount: number; onSuccess: () => void }) {
  const stripe = useStripe();
  const elements = useElements();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;
    setLoading(true);
    setError(null);

    const { error: submitError } = await elements.submit();
    if (submitError) {
      setError(submitError.message ?? 'Erreur');
      setLoading(false);
      return;
    }

    const result = await stripe.confirmPayment({
      elements,
      confirmParams: { return_url: window.location.href + '?payment=success' },
      redirect: 'if_required',
    });

    if (result.error) {
      setError(result.error.message ?? 'Erreur de paiement');
      setLoading(false);
    } else {
      onSuccess();
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="p-4 rounded-xl bg-beige-100 border border-beige-200">
        <PaymentElement options={{ layout: 'tabs' }} />
      </div>

      <AnimatePresence>
        {error && (
          <motion.p
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="text-red-500 text-sm px-1"
          >
            {error}
          </motion.p>
        )}
      </AnimatePresence>

      <motion.button
        type="submit"
        disabled={!stripe || loading}
        className="btn-liquid w-full py-4 bg-brown-900 text-beige-50 rounded-xl font-medium overflow-hidden disabled:opacity-50"
        whileHover={{ scale: 1.01 }}
        whileTap={{ scale: 0.98 }}
      >
        <span className="relative z-10">
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <motion.span
                animate={{ rotate: 360 }}
                transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
                className="inline-block w-4 h-4 border-2 border-beige-200 border-t-transparent rounded-full"
              />
              Traitement…
            </span>
          ) : (
            `Payer ${amount.toFixed(2)} €`
          )}
        </span>
      </motion.button>
    </form>
  );
}

export default function StripePayment({
  amount,
  description,
  onSuccess,
}: {
  amount: number;
  description?: string;
  onSuccess: () => void;
}) {
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!stripePublicKey) {
      setError('Clés Stripe non configurées. Ajoutez NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY et STRIPE_SECRET_KEY dans .env.local');
      setLoading(false);
      return;
    }

    fetch('/api/stripe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount, description }),
    })
      .then((r) => r.json())
      .then((data) => {
        if (data.error) {
          setError(data.error);
        } else {
          setClientSecret(data.clientSecret);
        }
        setLoading(false);
      })
      .catch(() => {
        setError('Impossible de contacter le serveur');
        setLoading(false);
      });
  }, [amount, description]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
          className="w-6 h-6 border-2 border-gold-400 border-t-transparent rounded-full"
        />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-600 text-sm">
        <p className="font-medium mb-1">Configuration requise</p>
        <p className="text-xs text-red-500">{error}</p>
      </div>
    );
  }

  if (!clientSecret || !stripePromise) return null;

  return (
    <Elements
      stripe={stripePromise}
      options={{
        clientSecret,
        appearance: { theme: 'flat' },
      }}
    >
      <CheckoutForm amount={amount} onSuccess={onSuccess} />
    </Elements>
  );
}
