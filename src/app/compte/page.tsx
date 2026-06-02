'use client';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { getCurrentUser, getUserResponses, logoutUser } from '@/lib/store';
import { AppUser, Form, FormResponse } from '@/lib/types';
import { formatDate, parseEventDate, downloadICS } from '@/lib/utils';

export default function ComptePage() {
  const router = useRouter();
  const [user] = useState<AppUser | null>(() => getCurrentUser());
  const [reservations, setReservations] = useState<{ form: Form; response: FormResponse }[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!user) {
      router.push('/user-login');
      return;
    }
    getUserResponses(user.id).then((r) => {
      setReservations(r);
      setLoaded(true);
    });
  }, [router, user]);

  const handleLogout = async () => {
    await logoutUser();
    router.push('/');
  };

  // Prochain rendez-vous : événement à venir le plus proche (#34)
  const nextEvent = reservations
    .map(({ form, response }) => ({
      form, response,
      date: parseEventDate(form.fields.find((f) => f.type === 'event_date')?.presetValue),
      venue: form.fields.find((f) => f.type === 'event_date')?.venue,
    }))
    .filter((x) => x.date && x.date.getTime() >= Date.now() - 86400000 && x.response.data._waitlist !== 'true')
    .sort((a, b) => (a.date!.getTime() - b.date!.getTime()))[0];

  const daysUntilNext = nextEvent?.date
    ? Math.max(0, Math.ceil((nextEvent.date.getTime() - Date.now()) / 86400000))
    : null;

  const year = new Date().getFullYear();
  const donationsThisYear = reservations
    .filter(({ form, response }) =>
      (response.data._donation || form.id.startsWith('dons-')) &&
      response.paymentStatus === 'paid' &&
      response.submittedAt && new Date(response.submittedAt).getFullYear() === year)
    .reduce((s, { response }) => s + (response.paymentAmount ?? 0), 0);

  if (!loaded) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1.2, ease: 'linear' }}
          className="w-8 h-8 border-2 border-gold-400 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 sm:px-10 py-4">
        <div className="absolute inset-0 glass border-b border-gold-400/10" />
        <Link href="/" className="relative flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-gold-400 to-gold-600 flex items-center justify-center">
            <span className="text-beige-50 text-sm font-bold">H</span>
          </div>
          <span className="text-brown-900 font-bold text-xl tracking-tight" style={{ fontFamily: 'var(--font-cormorant)' }}>
            HabadLyon
          </span>
        </Link>
        <div className="relative flex items-center gap-3">
          <span className="text-sm text-brown-600 hidden sm:block">
            {user?.firstName} {user?.lastName}
          </span>
          <motion.button
            onClick={handleLogout}
            className="px-4 py-2 rounded-xl text-brown-400 hover:text-brown-700 text-sm transition-colors hover:bg-beige-200"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.97 }}
          >
            Déconnexion
          </motion.button>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-6 pt-28 pb-20">
        {/* Title */}
        <motion.div
          className="mb-12"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <h1 className="text-5xl font-light text-brown-900 mb-2" style={{ fontFamily: 'var(--font-cormorant)' }}>
            Bonjour, <em className="gradient-text not-italic">{user?.firstName}</em>
          </h1>
          <p className="text-brown-500">Voici vos réservations et inscriptions.</p>
        </motion.div>

        {/* Prochain rendez-vous */}
        {nextEvent && nextEvent.date && (
          <motion.div
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            className="mb-8 rounded-2xl border border-gold-400/30 bg-gold-400/5 p-6"
          >
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div>
                <p className="text-xs uppercase tracking-widest text-gold-600 mb-1">
                  Prochain rendez-vous {daysUntilNext === 0 ? '· aujourd’hui' : daysUntilNext ? `· dans ${daysUntilNext} jour${daysUntilNext > 1 ? 's' : ''}` : ''}
                </p>
                <h3 className="text-2xl font-light text-brown-900" style={{ fontFamily: 'var(--font-cormorant)' }}>{nextEvent.form.title}</h3>
                <p className="text-brown-500 text-sm mt-1">
                  📅 {nextEvent.date.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                  {nextEvent.venue ? ` · ${nextEvent.venue}` : ''}
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => downloadICS(nextEvent.form.title, nextEvent.date!, nextEvent.venue)}
                  className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-brown-900 text-beige-50 text-sm font-medium hover:bg-brown-800 transition-colors"
                >
                  📅 Agenda
                </button>
                <Link href={`/billet/${nextEvent.response.id}`}
                  className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-gold-400/40 text-brown-800 text-sm font-medium hover:bg-gold-400/10 transition-colors">
                  🎟️ Billet
                </Link>
              </div>
            </div>
          </motion.div>
        )}

        {/* Cartes stats membre */}
        {loaded && reservations.length > 0 && (
          <div className="grid grid-cols-3 gap-3 sm:gap-4 mb-8">
            {[
              { label: 'Réservations', value: String(reservations.length), icon: '✦' },
              { label: 'Billets', value: String(reservations.filter((r) => r.response.data._waitlist !== 'true').length), icon: '🎟️' },
              { label: `Dons ${year}`, value: donationsThisYear > 0 ? `${donationsThisYear}€` : '—', icon: '🤲' },
            ].map((s, i) => (
              <motion.div key={s.label}
                initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}
                className="p-5 rounded-2xl bg-beige-50 border border-beige-200 text-center">
                <div className="text-xl text-gold-500 mb-1">{s.icon}</div>
                <p className="text-2xl font-light text-brown-900" style={{ fontFamily: 'var(--font-cormorant)' }}>{s.value}</p>
                <p className="text-[10px] sm:text-xs text-brown-400 uppercase tracking-wide">{s.label}</p>
              </motion.div>
            ))}
          </div>
        )}

        {/* Récap annuel des dons */}
        {donationsThisYear > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            className="mb-8 rounded-2xl bg-brown-900 text-beige-50 p-6 flex items-center justify-between gap-4"
          >
            <div>
              <p className="text-xs uppercase tracking-widest text-gold-300/80 mb-1">Vos dons {year}</p>
              <p className="text-3xl font-light" style={{ fontFamily: 'var(--font-cormorant)' }}>{donationsThisYear.toFixed(2)} €</p>
              <p className="text-beige-300 text-xs mt-1">Total déductible — conservez vos reçus pour votre déclaration.</p>
            </div>
            <span className="text-4xl" aria-hidden="true">🧾</span>
          </motion.div>
        )}

        {/* Reservations */}
        <AnimatePresence mode="popLayout">
          {reservations.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex flex-col items-center justify-center py-24 text-center rounded-3xl border-2 border-dashed border-beige-300"
            >
              <div className="text-5xl text-beige-300 mb-6 float-1">◈</div>
              <h3 className="text-2xl font-light text-brown-600 mb-3" style={{ fontFamily: 'var(--font-cormorant)' }}>
                Aucune réservation
              </h3>
              <p className="text-brown-400 text-sm mb-8 max-w-xs">
                Vous n&apos;avez pas encore de réservation. Inscrivez-vous à un événement pour le voir apparaître ici.
              </p>
              <Link href="/">
                <motion.button
                  className="btn-liquid px-8 py-3.5 bg-brown-900 text-beige-50 rounded-xl text-sm font-medium overflow-hidden"
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                >
                  <span className="relative z-10">Voir les événements →</span>
                </motion.button>
              </Link>
            </motion.div>
          ) : (
            <div className="space-y-4">
              {reservations.map(({ form, response }, i) => {
                const civility = response.data._civility as string;
                const firstName = response.data._firstName as string;
                const lastName = response.data._lastName as string;
                const phone = response.data._phone as string;
                const isWaitlist = response.data._waitlist === 'true';
                const paymentLabel = response.paymentMethod === 'cash'
                  ? '💵 Espèces (sur place)'
                  : response.paymentMethod === 'card'
                  ? '💳 Carte (payé)'
                  : undefined;

                return (
                  <motion.div
                    key={response.id}
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.06, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                    className="bg-beige-50 rounded-2xl border border-beige-200 overflow-hidden hover:border-gold-400/40 transition-colors"
                    whileHover={{ y: -2, boxShadow: '0 12px 40px rgba(44,24,16,0.07)' }}
                  >
                    <div className="h-0.5 bg-gradient-to-r from-gold-400/60 to-transparent" />
                    <div className="p-6">
                      <div className="flex items-start justify-between gap-4 mb-4">
                        <div>
                          <h3 className="text-xl font-medium text-brown-900 mb-0.5" style={{ fontFamily: 'var(--font-cormorant)' }}>
                            {form.title}
                          </h3>
                          {form.description && (
                            <p className="text-xs text-brown-400">{form.description}</p>
                          )}
                        </div>
                        {isWaitlist ? (
                          <span className="text-xs px-3 py-1.5 rounded-full bg-red-50 text-red-600 border border-red-200 flex-shrink-0 whitespace-nowrap font-medium">
                            ⏳ Liste d&apos;attente
                          </span>
                        ) : paymentLabel && (
                          <span className="text-xs px-3 py-1.5 rounded-full bg-gold-400/10 text-gold-700 border border-gold-400/20 flex-shrink-0 whitespace-nowrap">
                            {paymentLabel}
                          </span>
                        )}
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
                        {civility && <InfoChip label="Civilité" value={civility} />}
                        {firstName && <InfoChip label="Prénom" value={firstName} />}
                        {lastName && <InfoChip label="Nom" value={lastName} />}
                        {phone && <InfoChip label="Téléphone" value={phone} />}
                      </div>

                      <div className="flex items-center justify-between gap-3">
                        <p className="text-xs text-brown-300">
                          Inscrit le {formatDate(response.submittedAt)}
                        </p>
                        {isWaitlist ? (
                          <span className="text-xs text-brown-400 whitespace-nowrap">En attente d&apos;une place</span>
                        ) : (
                          <Link
                            href={`/billet/${response.id}`}
                            className="text-xs font-medium text-gold-700 hover:text-gold-600 border border-gold-400/30 px-3 py-1.5 rounded-lg hover:bg-gold-400/10 transition-colors whitespace-nowrap"
                          >
                            🎟️ Voir mon billet
                          </Link>
                        )}
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

function InfoChip({ label, value }: { label: string; value: string }) {
  return (
    <div className="p-3 rounded-xl bg-beige-100 text-center">
      <p className="text-[10px] text-brown-400 uppercase tracking-wide mb-0.5">{label}</p>
      <p className="text-sm font-medium text-brown-900 truncate">{value}</p>
    </div>
  );
}
