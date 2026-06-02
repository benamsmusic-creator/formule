'use client';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import Image from 'next/image';
import { Form, FormResponse, TableOption } from '@/lib/types';
import { parseEventDate } from '@/lib/utils';

const GOLD = '#C9A96E';

function useCountdown(target: Date | null) {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    const tick = () => setNow(Date.now());
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);
  if (!target || now === null) return null;
  const diff = Math.max(0, target.getTime() - now);
  return {
    days: Math.floor(diff / 86400000),
    hours: Math.floor((diff % 86400000) / 3600000),
    mins: Math.floor((diff % 3600000) / 60000),
    secs: Math.floor((diff % 60000) / 1000),
  };
}

export default function GalaPage() {
  const [gala, setGala] = useState<Form | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [sparks, setSparks] = useState<{ x: number; y: number; d: number; s: number }[]>([]);

  useEffect(() => {
    fetch('/api/forms?org=habadlyon')
      .then((r) => r.json())
      .then((forms: Form[]) => {
        if (Array.isArray(forms)) {
          const g = forms.find((f) => !f.archived && !f.disabled && f.fields?.some((x) => x.type === 'table_reservation'));
          setGala(g ?? null);
        }
      })
      .finally(() => setLoaded(true));
    // étincelles dorées (après montage → pas de mismatch SSR)
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSparks(Array.from({ length: 28 }, () => ({
      x: Math.random() * 100, y: Math.random() * 100, d: Math.random() * 6, s: 1 + Math.random() * 2,
    })));
  }, []);

  const dateField = gala?.fields.find((f) => f.type === 'event_date');
  const tableField = gala?.fields.find((f) => f.type === 'table_reservation');
  const eventDate = parseEventDate(dateField?.presetValue);
  const cd = useCountdown(eventDate);

  const confirmedSeats = (gala?.responses ?? [])
    .filter((r: FormResponse) => (r.data as Record<string, unknown>)?._waitlist !== 'true')
    .reduce((s, r) => s + (parseInt(((r.data as Record<string, string>)?._guestCount) || '0', 10) || 0), 0);
  const capacity = gala?.maxCapacity;
  const seatsLeft = capacity ? Math.max(0, capacity - confirmedSeats) : null;

  // Thermomètre de collecte (#23)
  const raised = (gala?.responses ?? [])
    .filter((r: FormResponse) => r.paymentStatus === 'paid' || r.paymentStatus === 'cash')
    .reduce((s, r) => s + (r.paymentAmount ?? 0), 0);
  // Objectif = recette potentielle à pleine capacité (prix/place le plus avantageux × capacité)
  const perSeatPrices = (tableField?.tableOptions ?? [])
    .filter((o) => o.seats > 0)
    .map((o) => o.price / o.seats);
  const bestPerSeat = perSeatPrices.length ? Math.min(...perSeatPrices) : 0;
  const goal = capacity && bestPerSeat ? Math.round(capacity * bestPerSeat) : 0;
  const raisedPct = goal > 0 ? Math.min(100, Math.round((raised / goal) * 100)) : 0;

  return (
    <div className="min-h-screen text-[#f5efe6] overflow-hidden" style={{ background: 'radial-gradient(1200px 600px at 50% -10%, #3a2a17 0%, #1a120b 45%, #0d0805 100%)' }}>
      {/* Étincelles dorées */}
      <div className="fixed inset-0 pointer-events-none">
        {sparks.map((sp, i) => (
          <motion.span key={i} className="absolute rounded-full"
            style={{ left: `${sp.x}%`, top: `${sp.y}%`, width: sp.s, height: sp.s, background: GOLD, boxShadow: `0 0 ${sp.s * 3}px ${GOLD}` }}
            animate={{ opacity: [0, 1, 0], y: [0, -30, -60] }}
            transition={{ duration: 4 + sp.d, repeat: Infinity, delay: sp.d, ease: 'easeInOut' }} />
        ))}
      </div>

      {/* Halo central animé */}
      <motion.div aria-hidden className="fixed top-0 left-1/2 -translate-x-1/2 w-[800px] h-[800px] rounded-full pointer-events-none"
        style={{ background: `radial-gradient(circle, ${GOLD}22 0%, transparent 60%)` }}
        animate={{ scale: [1, 1.15, 1], opacity: [0.6, 0.9, 0.6] }} transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut' }} />

      <div className="relative z-10">
        {/* Header */}
        <header className="max-w-5xl mx-auto px-6 h-20 flex items-center justify-between">
          <Link href="/" className="text-sm tracking-[0.25em] uppercase text-[#c9a96e]">HabadLyon</Link>
          <Link href="/events" className="text-xs text-[#d8c7ac]/70 hover:text-[#f5efe6] transition-colors">Tous les événements →</Link>
        </header>

        {!loaded ? (
          <div className="flex justify-center py-40">
            <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1.2, ease: 'linear' }}
              className="w-8 h-8 border-2 rounded-full" style={{ borderColor: `${GOLD}55`, borderTopColor: GOLD }} />
          </div>
        ) : !gala ? (
          <div className="text-center py-40 px-6">
            <p className="text-5xl mb-6" style={{ color: GOLD }}>✦</p>
            <h1 className="text-3xl font-light mb-3" style={{ fontFamily: 'var(--font-cormorant)' }}>Aucun gala programmé</h1>
            <p className="text-[#d8c7ac]/60 text-sm">Créez un événement avec une « réservation de table » pour activer cette page.</p>
          </div>
        ) : (
          <>
            {/* HERO */}
            <section className="max-w-3xl mx-auto px-6 pt-16 pb-24 text-center">
              <motion.p initial={{ opacity: 0, letterSpacing: '0.1em' }} animate={{ opacity: 1, letterSpacing: '0.35em' }} transition={{ duration: 1 }}
                className="text-xs uppercase mb-8" style={{ color: GOLD }}>
                Soirée de Gala · HabadLyon
              </motion.p>
              <motion.h1 initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
                className="text-[clamp(3rem,9vw,7rem)] leading-[0.95] font-light mb-6"
                style={{ fontFamily: 'var(--font-cormorant)', background: `linear-gradient(135deg,#fff,#e8c97e,#c9a96e,#fff)`, backgroundSize: '300% 300%', WebkitBackgroundClip: 'text', backgroundClip: 'text', WebkitTextFillColor: 'transparent', animation: 'gradientShift 5s ease infinite' }}>
                {gala.title}
              </motion.h1>
              {dateField?.presetValue && (
                <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }}
                  className="text-lg text-[#d8c7ac] mb-3">📅 {dateField.presetValue}{dateField.venue ? ` · ${dateField.venue}` : ''}</motion.p>
              )}
              {gala.description && (
                <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}
                  className="text-[#d8c7ac]/70 max-w-md mx-auto leading-relaxed mb-10">{gala.description}</motion.p>
              )}

              {/* Compte à rebours */}
              {cd && (
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }}
                  className="flex justify-center gap-3 sm:gap-5 mb-12">
                  {[['Jours', cd.days], ['Heures', cd.hours], ['Min', cd.mins], ['Sec', cd.secs]].map(([label, val]) => (
                    <div key={label as string} className="w-16 sm:w-20 py-3 rounded-2xl border" style={{ borderColor: `${GOLD}33`, background: '#ffffff08' }}>
                      <AnimatePresence mode="popLayout">
                        <motion.div key={String(val)} initial={{ y: -12, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 12, opacity: 0 }}
                          className="text-2xl sm:text-3xl font-light" style={{ fontFamily: 'var(--font-cormorant)', color: '#fff' }}>
                          {String(val).padStart(2, '0')}
                        </motion.div>
                      </AnimatePresence>
                      <div className="text-[10px] uppercase tracking-widest text-[#d8c7ac]/50 mt-1">{label}</div>
                    </div>
                  ))}
                </motion.div>
              )}

              <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.7, type: 'spring', stiffness: 200, damping: 18 }}>
                <Link href={`/forms/${gala.id}`}>
                  <motion.span
                    className="inline-flex items-center gap-3 px-10 py-4 rounded-full font-medium text-[#1a120b]"
                    style={{ background: `linear-gradient(135deg,#e8c97e,#c9a96e)`, boxShadow: `0 0 40px ${GOLD}66` }}
                    whileHover={{ scale: 1.05, boxShadow: `0 0 60px ${GOLD}99` }} whileTap={{ scale: 0.97 }}
                    animate={{ boxShadow: [`0 0 30px ${GOLD}44`, `0 0 55px ${GOLD}88`, `0 0 30px ${GOLD}44`] }}
                    transition={{ boxShadow: { duration: 2.5, repeat: Infinity } }}>
                    Réserver ma table ✦
                  </motion.span>
                </Link>
              </motion.div>

              {seatsLeft !== null && (
                <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.9 }}
                  className="mt-5 text-sm text-[#d8c7ac]/60">
                  {seatsLeft > 0 ? <>Plus que <span style={{ color: GOLD }} className="font-semibold">{seatsLeft}</span> places disponibles</> : 'Complet — inscription sur liste d’attente'}
                </motion.p>
              )}

              {/* Thermomètre de collecte */}
              {goal > 0 && raised > 0 && (
                <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1 }}
                  className="mt-10 max-w-md mx-auto">
                  <div className="flex items-end justify-between mb-2">
                    <span className="text-2xl font-light" style={{ fontFamily: 'var(--font-cormorant)', color: '#fff' }}>{raised.toLocaleString('fr-FR')} €</span>
                    <span className="text-xs text-[#d8c7ac]/60">objectif {goal.toLocaleString('fr-FR')} €</span>
                  </div>
                  <div className="h-3 rounded-full overflow-hidden" style={{ background: '#ffffff14' }}>
                    <motion.div className="h-full rounded-full"
                      style={{ background: `linear-gradient(90deg,#9a7a3a,#e8c97e)`, boxShadow: `0 0 16px ${GOLD}88` }}
                      initial={{ width: 0 }} animate={{ width: `${raisedPct}%` }}
                      transition={{ duration: 1.4, ease: [0.22, 1, 0.36, 1], delay: 1.1 }} />
                  </div>
                  <p className="mt-2 text-xs text-[#d8c7ac]/50">{raisedPct}% de l’objectif atteint · merci pour votre soutien 🙏</p>
                </motion.div>
              )}
            </section>

            {/* Cover image en bandeau si dispo */}
            {gala.coverImage && (
              <motion.section initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} transition={{ duration: 0.8 }}
                className="max-w-4xl mx-auto px-6 pb-24">
                <div className="relative h-64 sm:h-96 rounded-3xl overflow-hidden border" style={{ borderColor: `${GOLD}33` }}>
                  <Image src={gala.coverImage} alt={gala.title} fill className="object-cover" unoptimized />
                  <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, #0d0805cc, transparent)' }} />
                </div>
              </motion.section>
            )}

            {/* Formules de table */}
            {tableField?.tableOptions && tableField.tableOptions.length > 0 && (
              <section className="max-w-4xl mx-auto px-6 pb-28">
                <motion.h2 initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
                  className="text-center text-3xl sm:text-4xl font-light mb-12" style={{ fontFamily: 'var(--font-cormorant)', color: '#fff' }}>
                  Nos formules
                </motion.h2>
                <div className="grid sm:grid-cols-3 gap-5">
                  {tableField.tableOptions.map((opt: TableOption, i: number) => (
                    <motion.div key={i} initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
                      transition={{ delay: i * 0.1, duration: 0.6 }}
                      whileHover={{ y: -6 }}
                      className="rounded-3xl border p-7 text-center" style={{ borderColor: `${GOLD}33`, background: '#ffffff06' }}>
                      <p className="text-sm uppercase tracking-widest mb-4" style={{ color: GOLD }}>{opt.label}</p>
                      <p className="text-4xl font-light mb-1" style={{ fontFamily: 'var(--font-cormorant)', color: '#fff' }}>{opt.price} €</p>
                      <p className="text-xs text-[#d8c7ac]/60 mb-6">{opt.seats} place{opt.seats > 1 ? 's' : ''}</p>
                      <Link href={`/forms/${gala.id}`}>
                        <span className="inline-block px-6 py-2.5 rounded-full text-sm border transition-colors hover:bg-[#c9a96e] hover:text-[#1a120b]" style={{ borderColor: GOLD, color: GOLD }}>
                          Choisir
                        </span>
                      </Link>
                    </motion.div>
                  ))}
                </div>
              </section>
            )}

            {/* CTA final */}
            <section className="max-w-3xl mx-auto px-6 pb-32 text-center">
              <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
                <p className="text-2xl sm:text-3xl font-light mb-8 text-[#e8d9c5]" style={{ fontFamily: 'var(--font-cormorant)' }}>
                  Une soirée d’exception nous attend.
                </p>
                <Link href={`/forms/${gala.id}`}>
                  <motion.span className="inline-flex items-center gap-3 px-10 py-4 rounded-full font-medium text-[#1a120b]"
                    style={{ background: `linear-gradient(135deg,#e8c97e,#c9a96e)` }}
                    whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.97 }}>
                    Réserver maintenant →
                  </motion.span>
                </Link>
              </motion.div>
            </section>
          </>
        )}

        <footer className="border-t py-8 text-center text-xs text-[#d8c7ac]/40" style={{ borderColor: '#ffffff12' }}>
          © {new Date().getFullYear()} HabadLyon
        </footer>
      </div>
    </div>
  );
}
