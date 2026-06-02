'use client';
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import Image from 'next/image';
import { Form } from '@/lib/types';
import { parseEventDate, downloadICS } from '@/lib/utils';
import { SkeletonCards } from '@/components/Skeleton';

function Countdown({ target }: { target: Date }) {
  const [now, setNow] = useState<number>(() => target.getTime() - 1); // valeur initiale stable (SSR)
  useEffect(() => {
    const tick = () => setNow(Date.now());
    tick();
    const id = setInterval(tick, 60000);
    return () => clearInterval(id);
  }, []);
  const diff = target.getTime() - now;
  if (diff <= 0) return null;
  const days = Math.floor(diff / 86400000);
  const hours = Math.floor((diff % 86400000) / 3600000);
  const mins = Math.floor((diff % 3600000) / 60000);
  return (
    <span className="flex items-center gap-1 text-xs text-gold-700 bg-gold-400/10 border border-gold-400/20 px-2.5 py-1 rounded-full">
      ⏳ {days > 0 ? `J-${days}` : hours > 0 ? `${hours}h${String(mins).padStart(2, '0')}` : `${mins} min`}
    </span>
  );
}

function shareEvent(title: string, formId: string) {
  if (typeof window === 'undefined') return;
  const url = `${window.location.origin}/forms/${formId}`;
  const text = `${title} — HabadLyon`;
  if (typeof navigator !== 'undefined' && navigator.share) {
    navigator.share({ title, text, url }).catch(() => {});
  } else {
    window.open(`https://wa.me/?text=${encodeURIComponent(`${text}\n${url}`)}`, '_blank');
  }
}

function EventCard({ form, index }: { form: Form; index: number }) {
  const eventDateField = form.fields.find((f) => f.type === 'event_date');
  const paymentField = form.fields.find((f) => f.type === 'payment');
  const peopleField = form.fields.find((f) => f.type === 'people_count');
  const tableField = form.fields.find((f) => f.type === 'table_reservation');
  const tableFrom = tableField?.tableOptions?.length
    ? Math.min(...tableField.tableOptions.map((o) => o.price))
    : undefined;
  const eventDate = parseEventDate(eventDateField?.presetValue);
  const confirmedGuests = (form.responses ?? [])
    .filter((r) => (r.data as Record<string, unknown>)?._waitlist !== 'true')
    .reduce((s, r) => s + (parseInt(((r.data as Record<string, string>)?._guestCount) || '1', 10) || 1), 0);
  const isFull = typeof form.maxCapacity === 'number' && form.maxCapacity > 0 && confirmedGuests >= form.maxCapacity;

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.08, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className="group bg-beige-50 rounded-2xl border border-beige-200 overflow-hidden hover:border-gold-400/40 transition-all duration-300"
      whileHover={{ y: -4, boxShadow: '0 20px 60px rgba(44,24,16,0.08)' }}
    >
      {/* Cover image */}
      {form.coverImage ? (
        <div className="relative h-48 overflow-hidden">
          <Image src={form.coverImage} alt={form.title} fill className="object-cover object-top group-hover:scale-105 transition-transform duration-500" unoptimized />
          <div className="absolute inset-0 bg-gradient-to-t from-brown-900/60 to-transparent" />
          {eventDateField?.presetValue && (
            <div className="absolute bottom-3 left-4">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-brown-900/70 backdrop-blur-sm text-beige-50 text-xs font-medium border border-white/10">
                📅 {eventDateField.presetValue}
              </span>
            </div>
          )}
        </div>
      ) : (
        <div className="h-1 bg-gradient-to-r from-gold-400/60 to-transparent" />
      )}

      <div className="p-6">
        {/* Date sans image */}
        {!form.coverImage && eventDateField?.presetValue && (
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-gold-400/10 border border-gold-400/20 text-gold-600 text-xs font-medium mb-3">
            📅 {eventDateField.presetValue}
          </div>
        )}

        <h3
          className="text-xl font-medium text-brown-900 mb-1"
          style={{ fontFamily: 'var(--font-cormorant)' }}
        >
          {form.title}
        </h3>

        {form.description && (
          <p className="text-sm text-brown-500 mb-4 leading-relaxed line-clamp-2">{form.description}</p>
        )}

        {/* Infos */}
        <div className="flex flex-wrap gap-2 mb-5">
          {eventDateField?.venue && (
            <span className="flex items-center gap-1 text-xs text-brown-500 bg-beige-100 border border-beige-200 px-2.5 py-1 rounded-full">
              📍 {eventDateField.venue}
            </span>
          )}
          {paymentField?.amount && (
            <span className="flex items-center gap-1 text-xs text-gold-700 bg-gold-400/10 border border-gold-400/20 px-2.5 py-1 rounded-full">
              ◆ {paymentField.amount} € / personne
            </span>
          )}
          {tableFrom !== undefined && (
            <span className="flex items-center gap-1 text-xs text-gold-700 bg-gold-400/10 border border-gold-400/20 px-2.5 py-1 rounded-full">
              🍽️ Tables dès {tableFrom} €
            </span>
          )}
          {peopleField && (
            <span className="flex items-center gap-1 text-xs text-brown-500 bg-beige-100 border border-beige-200 px-2.5 py-1 rounded-full">
              👥 Jusqu&apos;à {peopleField.maxPeople ?? 8} personnes
            </span>
          )}
          {isFull && (
            <span className="flex items-center gap-1 text-xs text-red-600 bg-red-50 border border-red-200 px-2.5 py-1 rounded-full">● Complet</span>
          )}
          {eventDate && (() => {
            const today = new Date(); today.setHours(0, 0, 0, 0);
            const ev = new Date(eventDate); ev.setHours(0, 0, 0, 0);
            if (ev.getTime() === today.getTime()) {
              return <span className="flex items-center gap-1 text-xs text-green-700 bg-green-50 border border-green-200 px-2.5 py-1 rounded-full">● Aujourd&apos;hui</span>;
            }
            if (ev < today) {
              return <span className="flex items-center gap-1 text-xs text-brown-400 bg-beige-100 border border-beige-200 px-2.5 py-1 rounded-full">Passé</span>;
            }
            return <Countdown target={eventDate} />;
          })()}
        </div>

        <div className="flex items-center gap-2">
          <Link href={`/forms/${form.id}`} className="flex-1">
            <motion.button
              className="btn-liquid w-full py-3 bg-brown-900 text-beige-50 rounded-xl text-sm font-medium overflow-hidden"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.97 }}
            >
              <span className="relative z-10">{isFull ? 'Liste d’attente →' : 'S’inscrire →'}</span>
            </motion.button>
          </Link>
          {eventDate && (
            <motion.button
              onClick={() => downloadICS(form.title, eventDate, eventDateField?.venue)}
              className="w-12 h-12 flex-shrink-0 rounded-xl border border-beige-200 bg-beige-50 text-brown-500 flex items-center justify-center hover:border-gold-400/50 hover:text-gold-600 transition-colors"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              title="Ajouter à mon agenda"
              aria-label="Ajouter à mon agenda"
            >
              📅
            </motion.button>
          )}
          <motion.button
            onClick={() => shareEvent(form.title, form.id)}
            className="w-12 h-12 flex-shrink-0 rounded-xl border border-beige-200 bg-beige-50 text-brown-500 flex items-center justify-center hover:border-gold-400/50 hover:text-gold-600 transition-colors"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            title="Partager cet événement"
            aria-label="Partager cet événement"
          >
            ↗
          </motion.button>
        </div>
      </div>
    </motion.div>
  );
}

export default function EventsPage() {
  const [forms, setForms] = useState<Form[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    fetch('/api/forms')
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setForms(data.filter((f: Form) => !f.archived && !f.disabled && f.id !== 'dons-generaux'));
        }
      })
      .catch(() => {})
      .finally(() => setLoaded(true));
  }, []);

  return (
    <div className="min-h-screen pt-24 pb-20">
      <div className="max-w-5xl mx-auto px-6">
        {/* Header */}
        <motion.div
          className="mb-12 text-center"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <h1
            className="text-5xl sm:text-6xl font-light text-brown-900 mb-3"
            style={{ fontFamily: 'var(--font-cormorant)' }}
          >
            Nos <em className="gradient-text">événements</em>
          </h1>
          <p className="text-brown-500 text-base max-w-md mx-auto">
            Inscrivez-vous aux prochains événements de HabadLyon.
          </p>
        </motion.div>

        {/* Bannière Gala */}
        {loaded && forms.some((f) => f.fields.some((x) => x.type === 'table_reservation')) && (
          <motion.div
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
            className="mb-10 rounded-3xl overflow-hidden relative"
            style={{ background: 'linear-gradient(135deg,#2C1810,#4A2E18)' }}
          >
            <div className="px-8 py-8 sm:py-10 flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left">
              <div>
                <p className="text-xs uppercase tracking-[0.25em] text-gold-300 mb-1">Événement d&apos;exception</p>
                <h2 className="text-2xl sm:text-3xl font-light text-beige-50" style={{ fontFamily: 'var(--font-cormorant)' }}>Notre Soirée de Gala</h2>
              </div>
              <Link href="/gala">
                <motion.span whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.97 }}
                  className="inline-flex items-center px-7 py-3 rounded-full text-brown-900 text-sm font-semibold"
                  style={{ background: 'linear-gradient(135deg,#e8c97e,#c9a96e)' }}>
                  Découvrir ✦
                </motion.span>
              </Link>
            </div>
          </motion.div>
        )}

        {/* Grid */}
        {!loaded ? (
          <SkeletonCards count={6} />
        ) : forms.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center justify-center py-20 text-center"
          >
            <motion.div
              className="w-20 h-20 rounded-3xl flex items-center justify-center mb-6 text-3xl"
              style={{ background: 'linear-gradient(135deg, var(--color-beige-100), var(--color-beige-200))', border: '1px solid var(--color-beige-300)' }}
              animate={{ y: [0, -6, 0] }}
              transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
            >
              🗓️
            </motion.div>
            <h2 className="text-2xl font-light text-brown-700 mb-2" style={{ fontFamily: 'var(--font-cormorant)' }}>
              Aucun événement pour le moment
            </h2>
            <p className="text-brown-400 text-sm max-w-xs mx-auto">De nouveaux événements arrivent bientôt. Revenez vite !</p>
            <Link href="/horaires" className="mt-6 inline-flex items-center px-5 py-2.5 rounded-full border border-gold-400/40 text-brown-700 text-sm hover:bg-gold-400/10 transition-colors">
              Voir les horaires de Chabbat →
            </Link>
          </motion.div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {forms.map((form, i) => (
              <EventCard key={form.id} form={form} index={i} />
            ))}
          </div>
        )}

        {/* Back */}
        <motion.div
          className="mt-12 text-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
        >
          <Link href="/" className="text-sm text-brown-400 hover:text-brown-700 transition-colors">
            ← Retour à l&apos;accueil
          </Link>
        </motion.div>
      </div>
    </div>
  );
}
