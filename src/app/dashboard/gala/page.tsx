'use client';
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { Form } from '@/lib/types';

function CountUp({ value, suffix = '' }: { value: number; suffix?: string }) {
  const [n, setN] = useState(0);
  useEffect(() => {
    let raf = 0; const start = performance.now(); const dur = 900;
    const step = (t: number) => {
      const p = Math.min(1, (t - start) / dur);
      setN(Math.round(value * (1 - Math.pow(1 - p, 3))));
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [value]);
  return <>{n.toLocaleString('fr-FR')}{suffix}</>;
}

export default function GalaDashboard() {
  const [gala, setGala] = useState<Form | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    (async () => {
      const forms: Form[] = await (await fetch('/api/forms')).json();
      const g = Array.isArray(forms) ? forms.find((f) => !f.archived && f.fields?.some((x) => x.type === 'table_reservation')) : null;
      if (g) {
        const full: Form = await (await fetch(`/api/forms/${g.id}`)).json();
        setGala(full?.id ? full : g);
      }
    })().catch(() => {}).finally(() => setLoaded(true));
  }, []);

  if (loaded && !gala) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center text-center px-6">
        <p className="text-5xl text-gold-400 mb-4">✦</p>
        <h1 className="text-2xl font-light text-brown-900 mb-2" style={{ fontFamily: 'var(--font-cormorant)' }}>Aucun gala détecté</h1>
        <p className="text-brown-400 text-sm mb-6">Créez un événement avec une « réservation de table ».</p>
        <Link href="/builder" className="px-6 py-3 rounded-xl bg-brown-900 text-beige-50 text-sm">Créer le gala →</Link>
      </div>
    );
  }

  const responses = gala?.responses ?? [];
  const tableField = gala?.fields.find((f) => f.type === 'table_reservation');
  const confirmed = responses.filter((r) => (r.data as Record<string, unknown>)?._waitlist !== 'true');
  const waitlist = responses.length - confirmed.length;
  const seats = confirmed.reduce((s, r) => s + (parseInt(((r.data as Record<string, string>)?._guestCount) || '0', 10) || 0), 0);
  const capacity = gala?.maxCapacity ?? 0;
  const raised = responses.filter((r) => r.paymentStatus === 'paid' || r.paymentStatus === 'cash').reduce((s, r) => s + (r.paymentAmount ?? 0), 0);
  const checkedIn = responses.filter((r) => r.checkedIn).length;
  const tablesBooked = confirmed.filter((r) => tableField && (r.data as Record<string, string>)?.[tableField.id]).length;

  // Répartition par formule
  const breakdown: Record<string, { count: number; seats: number; amount: number }> = {};
  if (tableField?.tableOptions) {
    confirmed.forEach((r) => {
      const raw = (r.data as Record<string, string>)?.[tableField.id];
      if (!raw) return;
      try {
        const sel = JSON.parse(raw);
        const opt = tableField.tableOptions![sel.i];
        if (opt) {
          const b = (breakdown[opt.label] ??= { count: 0, seats: 0, amount: 0 });
          b.count += sel.q || 1; b.seats += (opt.seats * (sel.q || 1)); b.amount += (opt.price * (sel.q || 1));
        }
      } catch { /* ignore */ }
    });
  }

  const pct = capacity ? Math.min(100, Math.round((seats / capacity) * 100)) : 0;

  return (
    <div className="min-h-screen pt-24 pb-20">
      <div className="max-w-5xl mx-auto px-5 sm:px-6">
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs uppercase tracking-widest text-gold-600">Centre de contrôle</p>
          <Link href="/dashboard" className="text-sm text-brown-500 hover:text-brown-800 transition-colors">← Dashboard</Link>
        </div>
        <h1 className="text-4xl sm:text-5xl font-light text-brown-900 mb-8" style={{ fontFamily: 'var(--font-cormorant)' }}>
          Gala — <em className="gradient-text">{gala?.title ?? '…'}</em>
        </h1>

        {!loaded ? (
          <p className="text-brown-400 text-sm">Chargement…</p>
        ) : (
          <>
            {/* KPI */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              {[
                { label: 'Collecté', value: raised, suffix: ' €', icon: '◆' },
                { label: 'Places confirmées', value: seats, suffix: capacity ? ` / ${capacity}` : '', icon: '👤' },
                { label: 'Tables réservées', value: tablesBooked, suffix: '', icon: '🍽️' },
                { label: 'Pointés (arrivés)', value: checkedIn, suffix: '', icon: '✓' },
              ].map((k, i) => (
                <motion.div key={k.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}
                  className="p-6 rounded-2xl bg-beige-50 border border-beige-200">
                  <div className="text-xl text-gold-500 mb-3">{k.icon}</div>
                  <p className="text-3xl font-light text-brown-900" style={{ fontFamily: 'var(--font-cormorant)' }}>
                    <CountUp value={k.value} suffix={k.suffix} />
                  </p>
                  <p className="text-[11px] text-brown-400 uppercase tracking-wide mt-1">{k.label}</p>
                </motion.div>
              ))}
            </div>

            {/* Jauge de remplissage */}
            {capacity > 0 && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}
                className="mb-8 p-6 rounded-2xl bg-beige-50 border border-beige-200">
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-brown-600">Remplissage de la salle</span>
                  <span className="font-semibold text-brown-900">{pct}%{waitlist > 0 ? ` · ${waitlist} en attente` : ''}</span>
                </div>
                <div className="h-4 rounded-full bg-beige-200 overflow-hidden">
                  <motion.div className="h-full rounded-full bg-gradient-to-r from-gold-500 to-gold-400"
                    initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }} />
                </div>
              </motion.div>
            )}

            {/* Répartition par formule */}
            {Object.keys(breakdown).length > 0 && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.35 }}
                className="mb-8 p-6 rounded-2xl bg-beige-50 border border-beige-200">
                <h2 className="text-lg font-medium text-brown-900 mb-4" style={{ fontFamily: 'var(--font-cormorant)' }}>Par formule</h2>
                <div className="space-y-2">
                  {Object.entries(breakdown).map(([label, b]) => (
                    <div key={label} className="flex items-center justify-between text-sm py-2 border-b border-beige-200 last:border-0">
                      <span className="text-brown-700">{label}</span>
                      <span className="text-brown-500">{b.count}× · {b.seats} places · <span className="font-semibold text-brown-900">{b.amount} €</span></span>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

            {/* Actions */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { href: '/gala', icon: '✦', label: 'Page publique', ext: true },
                { href: `/plan/${gala?.id}`, icon: '🪑', label: 'Plan de salle' },
                { href: `/dashboard/responses/${gala?.id}`, icon: '✦', label: 'Réservations' },
                { href: `/builder?id=${gala?.id}`, icon: '✎', label: 'Modifier' },
              ].map((a) => (
                <Link key={a.label} href={a.href} target={a.ext ? '_blank' : undefined}>
                  <motion.div whileHover={{ y: -2 }} className="p-4 rounded-2xl bg-beige-50 border border-beige-200 hover:border-gold-400/40 text-center transition-colors">
                    <div className="text-xl mb-1">{a.icon}</div>
                    <p className="text-xs font-medium text-brown-800">{a.label}</p>
                  </motion.div>
                </Link>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
