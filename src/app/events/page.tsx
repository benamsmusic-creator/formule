'use client';
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import Image from 'next/image';
import { Form } from '@/lib/types';

function EventCard({ form, index }: { form: Form; index: number }) {
  const eventDateField = form.fields.find((f) => f.type === 'event_date');
  const paymentField = form.fields.find((f) => f.type === 'payment');
  const peopleField = form.fields.find((f) => f.type === 'people_count');
  const tableField = form.fields.find((f) => f.type === 'table_reservation');
  const tableFrom = tableField?.tableOptions?.length
    ? Math.min(...tableField.tableOptions.map((o) => o.price))
    : undefined;

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
        </div>

        <Link href={`/forms/${form.id}`}>
          <motion.button
            className="btn-liquid w-full py-3 bg-brown-900 text-beige-50 rounded-xl text-sm font-medium overflow-hidden"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.97 }}
          >
            <span className="relative z-10">S&apos;inscrire →</span>
          </motion.button>
        </Link>
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

        {/* Grid */}
        {!loaded ? (
          <div className="flex justify-center py-24">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ repeat: Infinity, duration: 1.2, ease: 'linear' }}
              className="w-8 h-8 border-2 border-gold-400 border-t-transparent rounded-full"
            />
          </div>
        ) : forms.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center justify-center py-24 text-center"
          >
            <div className="text-6xl text-beige-300 mb-6">◈</div>
            <h2 className="text-2xl font-light text-brown-600 mb-2" style={{ fontFamily: 'var(--font-cormorant)' }}>
              Aucun événement disponible
            </h2>
            <p className="text-brown-400 text-sm">Revenez bientôt, de nouveaux événements arrivent.</p>
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
