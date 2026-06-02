'use client';
import { use, useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import StripePayment from '@/components/StripePayment';

interface Donor { name: string; amount: number; message: string | null; at: string }
interface Campaign {
  id: string; slug: string; title: string; description: string | null;
  goalAmount: number; raised: number; status: string; coverUrl: string | null;
  donorCount: number; donors: Donor[];
}

const PRESETS = [18, 36, 54, 100, 180, 360];

export default function CagnottePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const [c, setC] = useState<Campaign | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [step, setStep] = useState<'view' | 'form' | 'pay' | 'done'>('view');
  const [amount, setAmount] = useState(36);
  const [custom, setCustom] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [anonymous, setAnonymous] = useState(false);

  const org = typeof window !== 'undefined' ? (new URLSearchParams(window.location.search).get('org') || 'habadlyon') : 'habadlyon';

  const reload = useCallback(async () => {
    try {
      const r = await fetch(`/api/campaigns?slug=${encodeURIComponent(slug)}&org=${encodeURIComponent(org)}`);
      if (r.ok) setC(await r.json());
    } catch { /* ignore */ } finally { setLoaded(true); }
  }, [slug, org]);

  useEffect(() => { reload(); }, [reload]);

  const finalAmount = custom ? Math.max(0, Number(custom.replace(',', '.'))) : amount;

  const onPaid = async () => {
    await fetch('/api/campaigns/donate', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ slug, org, donorName: name, donorEmail: email, amount: finalAmount, message, anonymous }),
    });
    setStep('done');
    reload();
  };

  if (loaded && !c) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center text-center px-6">
        <p className="text-5xl text-gold-400 mb-4">✦</p>
        <p className="text-brown-500">Cagnotte introuvable.</p>
      </div>
    );
  }
  if (!c) return <div className="min-h-screen flex items-center justify-center"><div className="w-6 h-6 border-2 border-gold-400 border-t-transparent rounded-full animate-spin" /></div>;

  const pct = c.goalAmount > 0 ? Math.min(100, Math.round((c.raised / c.goalAmount) * 100)) : 0;
  const closed = c.status !== 'active';

  return (
    <div className="min-h-screen pt-24 pb-24">
      <div className="max-w-2xl mx-auto px-5 sm:px-6">
        {/* Cover */}
        {c.coverUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={c.coverUrl} alt={c.title} className="w-full h-52 sm:h-64 object-cover rounded-3xl mb-6 shadow-lg" />
        )}

        <p className="text-xs uppercase tracking-widest text-gold-600 mb-2">Cagnotte solidaire</p>
        <h1 className="text-4xl sm:text-5xl font-light text-brown-900 mb-4" style={{ fontFamily: 'var(--font-cormorant)' }}>{c.title}</h1>

        {/* Jauge objectif */}
        <div className="rounded-3xl bg-beige-50 border border-beige-200 p-6 mb-6 shadow-sm">
          <div className="flex items-end justify-between mb-3">
            <div>
              <p className="text-3xl sm:text-4xl font-semibold text-brown-900" style={{ fontFamily: 'var(--font-cormorant)' }}>{c.raised.toLocaleString('fr-FR')} €</p>
              <p className="text-sm text-brown-400">collectés{c.goalAmount > 0 ? ` sur ${c.goalAmount.toLocaleString('fr-FR')} €` : ''}</p>
            </div>
            {c.goalAmount > 0 && <span className="text-2xl font-light gradient-text" style={{ fontFamily: 'var(--font-cormorant)' }}>{pct}%</span>}
          </div>
          {c.goalAmount > 0 && (
            <div className="h-3 rounded-full bg-beige-200 overflow-hidden">
              <motion.div className="h-full rounded-full bg-gradient-to-r from-gold-400 to-gold-600"
                initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 1, ease: 'easeOut' }} />
            </div>
          )}
          <div className="flex items-center justify-between mt-4">
            <span className="text-xs text-brown-400">👥 {c.donorCount} donateur{c.donorCount > 1 ? 's' : ''}</span>
            {!closed && step === 'view' && (
              <button onClick={() => setStep('form')} className="px-5 py-2.5 rounded-xl bg-brown-900 text-beige-50 text-sm font-medium hover:bg-brown-800 transition-colors">
                ❤️ Je participe
              </button>
            )}
            {closed && <span className="text-xs px-3 py-1 rounded-full bg-beige-200 text-brown-500">Cagnotte clôturée</span>}
          </div>
        </div>

        {/* Description */}
        {c.description && step === 'view' && (
          <div className="rounded-3xl bg-beige-50 border border-beige-200 p-6 mb-6 whitespace-pre-wrap text-brown-700 text-sm leading-relaxed">
            {c.description}
          </div>
        )}

        {/* Étape : choix du don */}
        <AnimatePresence mode="wait">
          {step === 'form' && (
            <motion.div key="form" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }}
              className="rounded-3xl bg-beige-50 border border-beige-200 p-6 mb-6">
              <h2 className="text-2xl font-light text-brown-900 mb-4" style={{ fontFamily: 'var(--font-cormorant)' }}>Votre don</h2>
              <div className="grid grid-cols-3 gap-2 mb-4">
                {PRESETS.map((p) => (
                  <button key={p} onClick={() => { setAmount(p); setCustom(''); }}
                    className={`py-3 rounded-xl border text-sm font-medium transition-colors ${!custom && amount === p ? 'bg-gold-400/20 border-gold-400 text-gold-700' : 'bg-white border-beige-200 text-brown-600 hover:border-gold-400/40'}`}>
                    {p} €
                  </button>
                ))}
              </div>
              <input type="number" inputMode="decimal" value={custom} onChange={(e) => setCustom(e.target.value)} placeholder="Autre montant (€)"
                className="w-full px-3 py-2.5 rounded-xl bg-white border border-beige-200 text-sm text-brown-900 focus:outline-none focus:border-gold-400 transition-colors mb-3" />
              <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Votre nom"
                className="w-full px-3 py-2.5 rounded-xl bg-white border border-beige-200 text-sm text-brown-900 focus:outline-none focus:border-gold-400 transition-colors mb-3" />
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email (pour le reçu)"
                className="w-full px-3 py-2.5 rounded-xl bg-white border border-beige-200 text-sm text-brown-900 focus:outline-none focus:border-gold-400 transition-colors mb-3" />
              <textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={2} placeholder="Un message de soutien (facultatif)"
                className="w-full px-3 py-2.5 rounded-xl bg-white border border-beige-200 text-sm text-brown-900 focus:outline-none focus:border-gold-400 transition-colors resize-none mb-3" />
              <label className="flex items-center gap-2 text-sm text-brown-600 mb-4 cursor-pointer">
                <input type="checkbox" checked={anonymous} onChange={(e) => setAnonymous(e.target.checked)} className="accent-gold-500" />
                Faire un don anonyme
              </label>
              <div className="flex gap-2">
                <button onClick={() => setStep('view')} className="px-4 py-3 rounded-xl border border-beige-200 text-brown-600 text-sm hover:bg-beige-100 transition-colors">Retour</button>
                <button onClick={() => finalAmount >= 1 && setStep('pay')} disabled={finalAmount < 1}
                  className="flex-1 py-3 rounded-xl bg-brown-900 text-beige-50 text-sm font-medium hover:bg-brown-800 transition-colors disabled:opacity-50">
                  Donner {finalAmount > 0 ? `${finalAmount.toLocaleString('fr-FR')} €` : ''}
                </button>
              </div>
            </motion.div>
          )}

          {step === 'pay' && (
            <motion.div key="pay" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }}
              className="rounded-3xl bg-beige-50 border border-beige-200 p-6 mb-6">
              <button onClick={() => setStep('form')} className="text-sm text-brown-400 hover:text-brown-700 mb-4">← Modifier</button>
              <h2 className="text-2xl font-light text-brown-900 mb-1" style={{ fontFamily: 'var(--font-cormorant)' }}>Paiement sécurisé</h2>
              <p className="text-sm text-brown-400 mb-5">Don de {finalAmount.toLocaleString('fr-FR')} € pour « {c.title} »</p>
              <StripePayment amount={finalAmount} description={`Cagnotte : ${c.title}`} onSuccess={onPaid} />
            </motion.div>
          )}

          {step === 'done' && (
            <motion.div key="done" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
              className="rounded-3xl bg-beige-50 border border-gold-400/40 p-8 mb-6 text-center">
              <p className="text-5xl mb-3">🙏</p>
              <h2 className="text-2xl font-light text-brown-900 mb-2" style={{ fontFamily: 'var(--font-cormorant)' }}>Merci {name ? name.split(' ')[0] : ''} !</h2>
              <p className="text-sm text-brown-500">Votre don de {finalAmount.toLocaleString('fr-FR')} € a bien été enregistré.{email ? ' Un reçu vous sera envoyé.' : ''}</p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Mur de soutiens */}
        {c.donors.length > 0 && step !== 'pay' && (
          <div>
            <h3 className="text-sm font-medium text-brown-800 mb-3">💬 Ils soutiennent</h3>
            <div className="space-y-2">
              {c.donors.slice(0, 20).map((d, i) => (
                <div key={i} className="p-3.5 rounded-2xl bg-beige-50 border border-beige-200">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-brown-900">{d.name}</p>
                    <span className="text-sm text-gold-700">{d.amount.toLocaleString('fr-FR')} €</span>
                  </div>
                  {d.message && <p className="text-xs text-brown-500 mt-1 italic">« {d.message} »</p>}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
