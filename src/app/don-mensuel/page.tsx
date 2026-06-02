'use client';
import { useState } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';

const SUGGESTED = [18, 36, 54, 100];

export default function DonMensuelPage() {
  const [amount, setAmount] = useState<number | ''>(36);
  const [custom, setCustom] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const value = custom ? parseFloat(custom) : (amount || 0);

  const subscribe = async () => {
    setLoading(true); setError('');
    try {
      const res = await fetch('/api/stripe-subscription', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ amount: value }),
      });
      const d = await res.json();
      if (!res.ok || !d.url) throw new Error(d.error ?? 'Erreur');
      window.location.href = d.url;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-6 py-20">
      <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md text-center">
        <div className="text-5xl mb-4">🤲</div>
        <h1 className="text-3xl font-light text-brown-900 mb-2" style={{ fontFamily: 'var(--font-cormorant)' }}>
          Don <em className="gradient-text not-italic">mensuel</em>
        </h1>
        <p className="text-brown-500 text-sm mb-8">Soutenez la communauté chaque mois. Annulable à tout moment.</p>

        <div className="flex flex-wrap justify-center gap-3 mb-4">
          {SUGGESTED.map((a) => (
            <button key={a} onClick={() => { setAmount(a); setCustom(''); }}
              className={`px-6 py-4 rounded-2xl border-2 font-medium transition-colors ${!custom && amount === a ? 'border-gold-500 bg-gold-400/15 text-brown-900' : 'border-beige-200 bg-beige-50 text-brown-600 hover:border-gold-400/50'}`}>
              {a} €<span className="text-xs text-brown-400">/mois</span>
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2 rounded-2xl border-2 border-beige-200 bg-beige-50 px-5 py-3 max-w-xs mx-auto mb-6">
          <input type="number" min="1" placeholder="Autre montant" value={custom}
            onChange={(e) => setCustom(e.target.value)}
            className="flex-1 bg-transparent text-brown-900 text-lg font-light focus:outline-none w-full text-center" />
          <span className="text-brown-400">€/mois</span>
        </div>

        {error && <p className="text-red-500 text-sm mb-4">{error}</p>}

        <button onClick={subscribe} disabled={loading || value < 1}
          className="btn-liquid w-full py-4 bg-brown-900 text-beige-50 rounded-2xl font-medium text-base overflow-hidden disabled:opacity-40">
          <span className="relative z-10">{loading ? 'Redirection…' : `Faire un don de ${value || 0} €/mois →`}</span>
        </button>
        <p className="text-xs text-brown-400 mt-4">Paiement sécurisé par Stripe · annulable à tout moment</p>

        <Link href="/don" className="block mt-6 text-sm text-brown-400 hover:text-brown-700 transition-colors">← Faire un don unique</Link>
      </motion.div>
    </div>
  );
}
