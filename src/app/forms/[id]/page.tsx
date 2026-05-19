'use client';
import { use, useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { getForm, addResponse, getCurrentUser } from '@/lib/store';
import { Form, FormField } from '@/lib/types';
import { extractYouTubeId } from '@/lib/utils';
import dynamic from 'next/dynamic';
import Image from 'next/image';

const StripePayment = dynamic(() => import('@/components/StripePayment'), { ssr: false });

const SPRING = { type: 'spring' as const, stiffness: 260, damping: 30, mass: 0.9 };

// Pré-calculé une fois au chargement du module — Math.random() interdit dans le render
const CONFETTI = Array.from({ length: 14 }, (_, i) => ({
  width: Math.random() * 8 + 4,
  height: Math.random() * 8 + 4,
  animX: Math.cos((i / 14) * Math.PI * 2) * (150 + Math.random() * 100),
  animY: Math.sin((i / 14) * Math.PI * 2) * (150 + Math.random() * 100),
}));

function makeSlide(dir: number) {
  return {
    enter:  { y: dir >= 0 ? '100%' : '-100%' },
    center: { y: '0%',   transition: SPRING },
    exit:   { y: dir >= 0 ? '-100%' : '100%', transition: { ...SPRING, stiffness: 340, damping: 38 } },
  };
}

interface IdentityData {
  civility: 'M.' | 'Mme';
  firstName: string;
  lastName: string;
  phone: string;
}

/* ─── YouTube Ambiance Player ───────────────────────────────── */
/**
 * Lit une vidéo YouTube en fond sonore.
 * Stratégie autoplay : démarre muet (supporté par tous les navigateurs),
 * puis affiche un bouton flottant pour activer le son via postMessage API.
 * Si l'autoplay est complètement bloqué, le bouton permet aussi de démarrer.
 */
function YouTubeAmbiance({ url }: { url: string }) {
  const videoId = extractYouTubeId(url);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [muted, setMuted] = useState(true);   // démarre muet
  const [playing, setPlaying] = useState(false);

  // Envoie une commande à l'API YT IFrame via postMessage
  const send = useCallback((func: string, args: unknown[] = []) => {
    iframeRef.current?.contentWindow?.postMessage(
      JSON.stringify({ event: 'command', func, args }),
      '*'
    );
  }, []);

  // Écoute les événements de statut YouTube (onStateChange)
  useEffect(() => {
    const handler = (e: MessageEvent) => {
      const ytOrigins = ['https://www.youtube.com', 'https://www.youtube-nocookie.com'];
      if (!ytOrigins.includes(e.origin)) return;
      try {
        const d = typeof e.data === 'string' ? JSON.parse(e.data) : e.data;
        // state 1 = playing
        if (d.event === 'onStateChange' && d.info === 1) setPlaying(true);
      } catch { /* ignore */ }
    };
    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, []);

  // Force play après chargement (certains navigateurs nécessitent un délai)
  const handleIframeLoad = useCallback(() => {
    setTimeout(() => send('playVideo'), 800);
  }, [send]);

  const handleToggle = () => {
    if (!playing) {
      // Autoplay n'a pas démarré → on lance manuellement avec son
      send('playVideo');
      send('unMute');
      send('setVolume', [75]);
      setMuted(false);
      setPlaying(true);
    } else if (muted) {
      // Joue mais muet → activer le son
      send('unMute');
      send('setVolume', [75]);
      setMuted(false);
    } else {
      // Joue avec son → couper
      send('mute');
      setMuted(true);
    }
  };

  if (!videoId) return null;

  const label = !playing ? 'Jouer la musique' : muted ? 'Activer le son' : 'Couper le son';
  const icon  = !playing ? '▶' : muted ? '🔇' : '🔊';

  return (
    <>
      {/* Iframe cachée — 1×1px, hors viewport */}
      <iframe
        ref={iframeRef}
        src={`https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&mute=1&loop=1&playlist=${videoId}&enablejsapi=1&controls=0&disablekb=1&fs=0&iv_load_policy=3&modestbranding=1&rel=0`}
        allow="autoplay; encrypted-media"
        onLoad={handleIframeLoad}
        style={{ position: 'absolute', width: 1, height: 1, top: -9999, left: -9999, opacity: 0, pointerEvents: 'none' }}
        title="Musique d'ambiance"
      />

      {/* Bouton flottant — apparaît 1 s après le chargement */}
      <motion.button
        onClick={handleToggle}
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 1.2, type: 'spring', stiffness: 320, damping: 24 }}
        whileHover={{ scale: 1.06 }}
        whileTap={{ scale: 0.93 }}
        className="fixed bottom-12 right-4 z-50 flex items-center gap-2 px-3.5 py-2 rounded-full bg-brown-900/85 backdrop-blur-md text-beige-50 text-xs font-medium shadow-xl border border-white/10 max-w-[180px]"
        aria-label={label}
      >
        {/* Icône avec animation de pulsation si muet ou en attente */}
        <motion.span
          animate={(!playing || muted) ? { scale: [1, 1.25, 1] } : { scale: 1 }}
          transition={{ repeat: (!playing || muted) ? Infinity : 0, duration: 1.6 }}
          className="text-sm flex-shrink-0"
        >
          {icon}
        </motion.span>
        <span className="truncate">{label}</span>
      </motion.button>
    </>
  );
}

/* ─── Progress bar ──────────────────────────────────────────── */
function ProgressBar({ pct }: { pct: number }) {
  return (
    <div className="fixed top-0 left-0 right-0 z-50 h-0.5 bg-beige-200">
      <motion.div
        className="h-full bg-gradient-to-r from-gold-400 to-gold-300"
        animate={{ width: `${pct}%` }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      />
    </div>
  );
}

/* ─── Cover / Flyer screen ──────────────────────────────────── */
function CoverScreen({ form, onStart }: { form: Form; onStart: () => void }) {
  const eventDateField = form.fields.find((f) => f.type === 'event_date');

  return (
    <motion.div
      key="cover"
      className="absolute inset-0 flex flex-col"
      initial={{ y: '100%' }}
      animate={{ y: '0%', transition: SPRING }}
      exit={{ y: '-100%', transition: { ...SPRING, stiffness: 340 } }}
    >
      {form.coverImage ? (
        <div className="relative flex-1">
          <Image src={form.coverImage} alt="Flyer" fill className="object-cover object-top" priority unoptimized />
          <div className="absolute inset-0 bg-gradient-to-t from-brown-900/90 via-brown-900/20 to-transparent" />
          <div className="absolute inset-x-0 bottom-0 p-8 sm:p-14">
            <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25, duration: 0.7 }}>
              {eventDateField?.presetValue && (
                <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-gold-400/20 backdrop-blur-sm border border-gold-400/40 text-gold-200 text-sm font-medium mb-4">
                  📅 {eventDateField.presetValue}
                </div>
              )}
              <h1 className="text-[clamp(2rem,6vw,4.5rem)] font-light text-beige-50 leading-tight mb-3 drop-shadow-xl"
                style={{ fontFamily: 'var(--font-cormorant)' }}>
                {form.title}
              </h1>
              {form.description && (
                <p className="text-beige-300 text-base max-w-lg mb-8 leading-relaxed">{form.description}</p>
              )}
              <motion.button onClick={onStart}
                className="inline-flex items-center gap-3 px-10 py-4 bg-beige-50 text-brown-900 rounded-2xl font-semibold text-base shadow-2xl"
                whileHover={{ scale: 1.04, y: -2 }} whileTap={{ scale: 0.97 }}
              >
                Commencer
                <motion.span animate={{ x: [0, 5, 0] }} transition={{ repeat: Infinity, duration: 1.5 }}>→</motion.span>
              </motion.button>
              <p className="mt-4 text-beige-400/40 text-xs">Entrée ↵</p>
            </motion.div>
          </div>
        </div>
      ) : (
        <div className="relative flex flex-col items-center justify-center flex-1 px-8 text-center">
          <motion.div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full pointer-events-none"
            style={{ background: 'radial-gradient(circle, rgba(201,169,110,0.12) 0%, transparent 70%)' }}
            animate={{ scale: [1, 1.1, 1] }} transition={{ repeat: Infinity, duration: 6 }} />
          <motion.div className="relative z-10 max-w-lg"
            initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2, duration: 0.7 }}>
            {eventDateField?.presetValue && (
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-gold-400/10 border border-gold-400/20 text-gold-600 text-sm mb-6">
                📅 {eventDateField.presetValue}
              </div>
            )}
            <h1 className="text-[clamp(2.5rem,7vw,5.5rem)] font-light text-brown-900 leading-tight mb-4"
              style={{ fontFamily: 'var(--font-cormorant)' }}>
              {form.title}
            </h1>
            {form.description && (
              <p className="text-brown-500 text-lg mb-10 leading-relaxed">{form.description}</p>
            )}
            <motion.button onClick={onStart}
              className="btn-liquid inline-flex items-center gap-3 px-10 py-4 bg-brown-900 text-beige-50 rounded-2xl font-medium text-base overflow-hidden"
              whileHover={{ scale: 1.04, y: -3 }} whileTap={{ scale: 0.97 }}>
              <span className="relative z-10 flex items-center gap-3">
                Commencer
                <motion.span animate={{ x: [0, 5, 0] }} transition={{ repeat: Infinity, duration: 1.5 }}>→</motion.span>
              </span>
            </motion.button>
            <p className="mt-5 text-brown-300 text-xs">Entrée ↵</p>
          </motion.div>
        </div>
      )}
    </motion.div>
  );
}

/* ─── Identity screen (step 2 — always shown) ───────────────── */
function IdentityScreen({
  onNext, onBack, direction,
}: {
  onNext: (data: IdentityData) => void;
  onBack: () => void;
  direction: number;
}) {
  const [civility, setCivility] = useState<'M.' | 'Mme' | ''>('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const slide = makeSlide(direction);

  const canProceed = civility !== '' && firstName.trim() !== '' && lastName.trim() !== '' && phone.trim() !== '';

  const handleSubmit = () => {
    if (!canProceed) return;
    onNext({ civility: civility as 'M.' | 'Mme', firstName: firstName.trim(), lastName: lastName.trim(), phone: phone.trim() });
  };

  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Enter' && canProceed) handleSubmit(); };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  });

  return (
    <motion.div
      key="identity"
      initial={slide.enter}
      animate={slide.center}
      exit={slide.exit}
      className="absolute inset-0 flex items-center justify-center overflow-y-auto"
    >
      <div className="w-full max-w-2xl mx-auto px-6 py-20">
        <h2 className="text-4xl sm:text-5xl font-light text-brown-900 mb-2" style={{ fontFamily: 'var(--font-cormorant)' }}>
          Vos informations
        </h2>
        <p className="text-brown-400 text-sm mb-10">Toutes les informations sont requises.</p>

        {/* Civilité */}
        <div className="mb-8">
          <label className="text-xs text-brown-400 uppercase tracking-wide mb-3 block font-medium">Civilité</label>
          <div className="flex gap-3">
            {(['M.', 'Mme'] as const).map((c) => (
              <motion.button
                key={c}
                type="button"
                onClick={() => setCivility(c)}
                className={`flex-1 py-4 rounded-2xl border-2 font-semibold text-base transition-all ${
                  civility === c
                    ? 'border-gold-500 bg-gold-400/15 text-brown-900'
                    : 'border-beige-200 bg-beige-50 text-brown-500 hover:border-gold-400/50'
                }`}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.97 }}
              >
                {c}
              </motion.button>
            ))}
          </div>
        </div>

        {/* Prénom */}
        <div className="mb-7">
          <label className="text-xs text-brown-400 uppercase tracking-wide mb-2 block font-medium">Prénom</label>
          <input
            className="w-full bg-transparent border-b-2 border-beige-300 focus:border-gold-500 text-brown-900 text-2xl font-light py-3 focus:outline-none transition-colors placeholder:text-beige-300"
            placeholder="Votre prénom"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            autoFocus
          />
        </div>

        {/* Nom */}
        <div className="mb-7">
          <label className="text-xs text-brown-400 uppercase tracking-wide mb-2 block font-medium">Nom</label>
          <input
            className="w-full bg-transparent border-b-2 border-beige-300 focus:border-gold-500 text-brown-900 text-2xl font-light py-3 focus:outline-none transition-colors placeholder:text-beige-300"
            placeholder="Votre nom de famille"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
          />
        </div>

        {/* Téléphone */}
        <div className="mb-10">
          <label className="text-xs text-brown-400 uppercase tracking-wide mb-2 block font-medium">Téléphone</label>
          <input
            className="w-full bg-transparent border-b-2 border-beige-300 focus:border-gold-500 text-brown-900 text-2xl font-light py-3 focus:outline-none transition-colors placeholder:text-beige-300"
            placeholder="06 12 34 56 78"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            inputMode="tel"
          />
        </div>

        <div className="flex items-center gap-4">
          <motion.button
            type="button"
            onClick={handleSubmit}
            disabled={!canProceed}
            className="btn-liquid flex items-center gap-2 px-8 py-3.5 bg-brown-900 text-beige-50 rounded-xl font-medium text-sm overflow-hidden disabled:opacity-30 disabled:cursor-not-allowed"
            whileHover={canProceed ? { scale: 1.03 } : {}}
            whileTap={canProceed ? { scale: 0.97 } : {}}
          >
            <span className="relative z-10">Continuer ↵</span>
          </motion.button>
          <motion.button type="button" onClick={onBack}
            className="px-4 py-3.5 rounded-xl text-brown-400 hover:text-brown-700 text-sm transition-colors"
            whileHover={{ x: -2 }}>
            ← Retour
          </motion.button>
        </div>
      </div>
    </motion.div>
  );
}

/* ─── People count field ────────────────────────────────────── */
function PeopleCountField({ value, onChange, max = 8 }: { value: string; onChange: (v: string) => void; max?: number }) {
  const count = parseInt(value || '0', 10);
  return (
    <div className="mt-2">
      <div className="flex flex-wrap gap-3">
        {Array.from({ length: max }, (_, i) => i + 1).map((n) => (
          <motion.button key={n} type="button" onClick={() => onChange(String(n))}
            className={`relative flex flex-col items-center justify-center w-16 h-16 rounded-2xl border-2 font-medium transition-all ${
              count === n ? 'border-gold-500 bg-gold-400/15 text-brown-900' : 'border-beige-200 bg-beige-50 text-brown-500 hover:border-gold-400/50'
            }`}
            whileHover={{ scale: 1.1, y: -2 }} whileTap={{ scale: 0.92 }}
            initial={{ opacity: 0, scale: 0.7 }} animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: n * 0.04, type: 'spring', stiffness: 400, damping: 18 }}>
            <span className="text-xl mb-0.5">{n <= 2 ? '🧑' : n <= 4 ? '👥' : '🎉'}</span>
            <span className="text-sm font-semibold">{n}</span>
            {count === n && (
              <motion.div layoutId="people-sel"
                className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-gold-500 flex items-center justify-center"
                initial={{ scale: 0 }} animate={{ scale: 1 }}>
                <span className="text-white text-[8px] font-bold">✓</span>
              </motion.div>
            )}
          </motion.button>
        ))}
      </div>
      {count > 0 && (
        <motion.p initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="mt-4 text-brown-500 text-sm">
          {count} personne{count > 1 ? 's' : ''} sélectionnée{count > 1 ? 's' : ''}
        </motion.p>
      )}
    </div>
  );
}

/* ─── Info block ────────────────────────────────────────────── */
function InfoBlock({ field }: { field: FormField }) {
  return (
    <motion.div
      className="mt-4 p-6 sm:p-8 rounded-2xl bg-beige-100 border border-gold-400/20 relative overflow-hidden"
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: 0.15, type: 'spring' }}
    >
      <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-gold-400 to-gold-300 rounded-l-2xl" />
      <p className="text-brown-700 text-base sm:text-lg leading-relaxed whitespace-pre-line pl-4">
        {field.presetValue}
      </p>
    </motion.div>
  );
}

/* ─── Event date display ────────────────────────────────────── */
function EventDateDisplay({ field }: { field: FormField }) {
  return (
    <motion.div className="mt-6 p-6 rounded-2xl bg-beige-100 border border-gold-400/20 text-center"
      initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.2, type: 'spring' }}>
      <motion.div className="text-5xl mb-3"
        animate={{ rotate: [0, 5, -5, 0] }} transition={{ repeat: Infinity, duration: 4 }}>📅</motion.div>
      <p className="text-3xl font-light text-brown-900 mb-1" style={{ fontFamily: 'var(--font-cormorant)' }}>
        {field.presetValue}
      </p>
      {field.venue && (
        <p className="flex items-center justify-center gap-1.5 text-brown-500 text-sm mt-2">
          <span>📍</span><span>{field.venue}</span>
        </p>
      )}
      {field.description && <p className="text-brown-400 text-sm mt-2">{field.description}</p>}
    </motion.div>
  );
}

/* ─── Question screen ───────────────────────────────────────── */
function QuestionScreen({
  field, index, total, value, onChange, onNext, onBack, isLast, direction,
}: {
  field: FormField; index: number; total: number;
  value: string | boolean; onChange: (v: string | boolean) => void;
  onNext: () => void; onBack: () => void; isLast: boolean; direction: number;
}) {
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement | null>(null);
  const slide = makeSlide(direction);
  const isAutoAdvance = field.type === 'event_date' || field.type === 'info_block';

  useEffect(() => {
    const el = inputRef.current;
    if (el) setTimeout(() => el.focus(), 380);
  }, [field.id]);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Enter' && field.type !== 'textarea' && canProceed) {
        e.preventDefault();
        onNext();
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  });

  const canProceed = isAutoAdvance || !field.required ||
    (field.type === 'checkbox' ? value === true : value !== '' && value !== false);

  const baseInput = 'w-full bg-transparent border-b-2 border-beige-300 focus:border-gold-500 text-brown-900 text-2xl sm:text-3xl font-light py-4 focus:outline-none transition-colors duration-200 placeholder:text-beige-300';

  return (
    <motion.div
      key={field.id}
      initial={slide.enter}
      animate={slide.center}
      exit={slide.exit}
      className="absolute inset-0 flex items-center justify-center overflow-y-auto"
    >
      <div className="w-full max-w-2xl mx-auto px-6 py-20">
        {!isAutoAdvance && (
          <div className="flex items-center gap-2 mb-8">
            <span className="text-gold-500 font-medium text-sm tabular-nums">{index + 1}</span>
            <span className="text-beige-300 text-sm">→</span>
            <span className="text-brown-400 text-sm">{index + 1} / {total}</span>
          </div>
        )}

        {field.imageUrl && (
          <div className="mb-8 rounded-2xl overflow-hidden">
            <Image src={field.imageUrl} alt={field.label} width={600} height={300}
              className="w-full h-48 sm:h-64 object-cover" unoptimized />
          </div>
        )}

        <h2 className={`font-light text-brown-900 leading-snug mb-2 ${isAutoAdvance ? 'text-2xl sm:text-3xl' : 'text-3xl sm:text-4xl'}`}
          style={{ fontFamily: 'var(--font-cormorant)' }}>
          {field.label}
          {field.required && !isAutoAdvance && <span className="text-gold-500 ml-1.5 text-2xl">*</span>}
        </h2>

        <div className="mt-4">
          {field.type === 'event_date' && <EventDateDisplay field={field} />}
          {field.type === 'info_block' && <InfoBlock field={field} />}

          {field.type === 'textarea' && (
            <textarea ref={inputRef as React.RefObject<HTMLTextAreaElement>}
              className="w-full bg-transparent border-b-2 border-beige-300 focus:border-gold-500 text-brown-900 text-xl font-light py-4 focus:outline-none transition-colors duration-200 placeholder:text-beige-300 resize-none"
              placeholder={field.placeholder ?? 'Votre réponse ici…'} rows={4}
              value={value as string} onChange={(e) => onChange(e.target.value)} />
          )}

          {field.type === 'people_count' && (
            <PeopleCountField value={value as string} onChange={onChange} max={field.maxPeople ?? 8} />
          )}

          {(field.type === 'radio' || field.type === 'select') && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-2">
              {(field.options ?? []).map((opt, i) => (
                <motion.button key={opt.label} type="button"
                  onClick={() => { onChange(opt.label); if (!opt.imageUrl) setTimeout(onNext, 280); }}
                  className={`relative group text-left rounded-2xl border-2 overflow-hidden transition-colors ${
                    value === opt.label ? 'border-gold-500 bg-gold-400/10' : 'border-beige-200 bg-beige-50 hover:border-gold-400/50'
                  }`}
                  initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 + i * 0.07 }}
                  whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                  {opt.imageUrl && (
                    <div className="w-full h-36 relative overflow-hidden">
                      <Image src={opt.imageUrl} alt={opt.label} fill className="object-cover group-hover:scale-105 transition-transform duration-500" unoptimized />
                      <div className="absolute inset-0 bg-gradient-to-t from-brown-900/50 to-transparent" />
                    </div>
                  )}
                  <div className={`flex items-center gap-3 ${opt.imageUrl ? 'px-4 py-3' : 'px-5 py-4'}`}>
                    <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                      value === opt.label ? 'border-gold-500' : 'border-beige-300'
                    }`}>
                      {value === opt.label && <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="w-3 h-3 rounded-full bg-gold-500" />}
                    </div>
                    <span className={`text-base font-medium ${value === opt.label ? 'text-brown-900' : 'text-brown-600'}`}>{opt.label}</span>
                  </div>
                </motion.button>
              ))}
            </div>
          )}

          {field.type === 'checkbox' && (
            <motion.button type="button" onClick={() => onChange(!value)}
              className={`flex items-center gap-4 px-6 py-4 rounded-2xl border-2 transition-colors w-full text-left ${
                value ? 'border-gold-500 bg-gold-400/10' : 'border-beige-200 bg-beige-50 hover:border-gold-400/40'
              }`}
              whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}>
              <div className={`w-6 h-6 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                value ? 'bg-gold-500 border-gold-500' : 'border-beige-300'
              }`}>
                {value && <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} className="text-white text-sm font-bold">✓</motion.span>}
              </div>
              <span className="text-lg text-brown-700">{field.label}</span>
            </motion.button>
          )}

          {(field.type === 'text' || field.type === 'email' || field.type === 'phone' || field.type === 'number') && (
            <input ref={inputRef as React.RefObject<HTMLInputElement>}
              type={field.type === 'email' ? 'email' : field.type === 'number' ? 'number' : 'text'}
              inputMode={field.type === 'phone' ? 'tel' : field.type === 'number' ? 'numeric' : undefined}
              className={baseInput} placeholder={field.placeholder ?? 'Votre réponse ici…'}
              value={value as string} onChange={(e) => onChange(e.target.value)} />
          )}
        </div>

        <div className="flex items-center gap-4 mt-10">
          <motion.button type="button" onClick={onNext} disabled={!canProceed}
            className="btn-liquid flex items-center gap-2 px-8 py-3.5 bg-brown-900 text-beige-50 rounded-xl font-medium text-sm overflow-hidden disabled:opacity-30 disabled:cursor-not-allowed"
            whileHover={canProceed ? { scale: 1.03 } : {}} whileTap={canProceed ? { scale: 0.97 } : {}}>
            <span className="relative z-10">{isLast ? 'Terminer' : 'Continuer'}</span>
            <span className="relative z-10">↵</span>
          </motion.button>

          <motion.button type="button" onClick={onBack}
            className="px-4 py-3.5 rounded-xl text-brown-400 hover:text-brown-700 text-sm transition-colors"
            whileHover={{ x: -2 }}>
            ← Retour
          </motion.button>

          {!isAutoAdvance && field.type !== 'radio' && field.type !== 'select' && field.type !== 'checkbox' && field.type !== 'people_count' && (
            <span className="text-xs text-brown-300 ml-auto">Entrée ↵</span>
          )}
        </div>
      </div>
    </motion.div>
  );
}

/* ─── Payment choice screen ─────────────────────────────────── */
function PaymentChoiceScreen({
  amount, onCash, onCard, onBack, direction, allowCash,
}: {
  amount: number; onCash: () => void; onCard: () => void; onBack: () => void; direction: number; allowCash?: boolean;
}) {
  const slide = makeSlide(direction);
  return (
    <motion.div
      key="payment_choice"
      initial={slide.enter}
      animate={slide.center}
      exit={slide.exit}
      className="absolute inset-0 flex items-center justify-center px-6"
    >
      <div className="w-full max-w-md">
        <button onClick={onBack} className="mb-8 text-xs text-brown-400 hover:text-brown-700 transition-colors flex items-center gap-1">
          ← Retour
        </button>
        <h2 className="text-4xl sm:text-5xl font-light text-brown-900 mb-2" style={{ fontFamily: 'var(--font-cormorant)' }}>
          Mode de paiement
        </h2>
        <p className="text-brown-400 text-sm mb-10">Montant total : <span className="font-semibold text-brown-700">{amount.toFixed(2)} €</span></p>

        <div className={`grid gap-4 ${allowCash ? 'grid-cols-2' : 'grid-cols-1'}`}>
          {allowCash && (
            <motion.button
              onClick={onCash}
              className="flex flex-col items-center gap-3 p-8 rounded-3xl border-2 border-beige-200 bg-beige-50 hover:border-gold-400/60 hover:bg-gold-400/5 transition-all"
              whileHover={{ scale: 1.03, y: -3 }}
              whileTap={{ scale: 0.97 }}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 }}
            >
              <span className="text-4xl">💵</span>
              <span className="font-semibold text-brown-900 text-base">Espèces</span>
              <span className="text-xs text-brown-400 text-center">Payez sur place</span>
            </motion.button>
          )}

          <motion.button
            onClick={onCard}
            className="flex flex-col items-center gap-3 p-8 rounded-3xl border-2 border-gold-400/40 bg-gold-400/8 hover:border-gold-500 hover:bg-gold-400/15 transition-all"
            whileHover={{ scale: 1.03, y: -3 }}
            whileTap={{ scale: 0.97 }}
            initial={{ opacity: 0, x: allowCash ? 20 : 0, y: allowCash ? 0 : 20 }}
            animate={{ opacity: 1, x: 0, y: 0 }}
            transition={{ delay: 0.15 }}
          >
            <span className="text-4xl">💳</span>
            <span className="font-semibold text-brown-900 text-base">Carte</span>
            <span className="text-xs text-brown-400 text-center">Paiement sécurisé</span>
          </motion.button>
        </div>
      </div>
    </motion.div>
  );
}

/* ─── Success screen ────────────────────────────────────────── */
function SuccessScreen({ paymentMethod }: { paymentMethod?: 'card' | 'cash' }) {
  return (
    <motion.div key="success" className="absolute inset-0 flex flex-col items-center justify-center px-6 text-center"
      initial={{ y: '100%' }} animate={{ y: '0%', transition: SPRING }} exit={{ y: '-100%' }}>
      <motion.div initial={{ scale: 0, rotate: -20 }} animate={{ scale: 1, rotate: 0 }}
        transition={{ type: 'spring', stiffness: 200, damping: 15, delay: 0.15 }}
        className="text-8xl text-gold-400 mb-8 select-none">✦</motion.div>

      {CONFETTI.map((p, i) => (
        <motion.div key={i} className="absolute rounded-full bg-gold-400/40"
          style={{ width: p.width, height: p.height, top: '50%', left: '50%' }}
          initial={{ x: 0, y: 0, opacity: 1 }}
          animate={{ x: p.animX, y: p.animY, opacity: 0 }}
          transition={{ duration: 1.4, delay: 0.3 + i * 0.03, ease: [0.22, 1, 0.36, 1] }} />
      ))}

      <motion.h2 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3, duration: 0.6 }}
        className="text-[clamp(2.5rem,6vw,5rem)] font-light text-brown-900 leading-tight mb-4"
        style={{ fontFamily: 'var(--font-cormorant)' }}>
        Inscription confirmée.
      </motion.h2>
      <motion.p initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.45 }}
        className="text-brown-500 text-lg max-w-sm">
        {paymentMethod === 'cash'
          ? 'Votre inscription est enregistrée. Le paiement sera effectué sur place.'
          : paymentMethod === 'card'
          ? 'Votre réservation et paiement ont bien été confirmés.'
          : 'Votre réponse a bien été enregistrée.'}
      </motion.p>
    </motion.div>
  );
}

/* ─── Main page ─────────────────────────────────────────────── */
export default function FormPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [form, setForm] = useState<Form | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [screen, setScreen] = useState<'cover' | 'identity' | 'questions' | 'payment_choice' | 'payment' | 'success'>('cover');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [direction, setDirection] = useState(1);
  const [formData, setFormData] = useState<Record<string, string | boolean>>({});
  const [identityData, setIdentityData] = useState<IdentityData | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<'card' | 'cash' | undefined>(undefined);

  useEffect(() => {
    const initForm = (f: Form) => {
      setForm(f);
      const init: Record<string, string | boolean> = {};
      f.fields.forEach((field) => {
        if (field.type === 'checkbox') init[field.id] = false;
        else if (field.type === 'event_date') init[field.id] = field.presetValue ?? '';
        else if (field.type === 'info_block') init[field.id] = '';
        else init[field.id] = '';
      });
      setFormData(init);
    };

    // Try server first (works on any device), fallback to localStorage
    fetch(`/api/forms/${id}`)
      .then((r) => r.ok ? r.json() : null)
      .then((f) => {
        if (f && f.id) {
          initForm(f);
        } else {
          const local = getForm(id);
          if (local) initForm(local);
          else setNotFound(true);
        }
      })
      .catch(() => {
        const local = getForm(id);
        if (local) initForm(local);
        else setNotFound(true);
      });
  }, [id]);

  const handleStart = useCallback(() => {
    if (!form) return;
    setDirection(1);
    setScreen('identity');
  }, [form]);

  useEffect(() => {
    if (screen !== 'cover') return;
    const h = (e: KeyboardEvent) => { if (e.key === 'Enter') handleStart(); };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [screen, handleStart]);

  const buildFinalData = (identity: IdentityData) => ({
    _civility: identity.civility,
    _firstName: identity.firstName,
    _lastName: identity.lastName,
    _phone: identity.phone,
    ...formData,
  });

  const goToPayment = (fromIdentity = false) => {
    setDirection(1);
    if (paymentField) {
      if (paymentField.allowCash) {
        setScreen('payment_choice');
      } else {
        setPaymentMethod('card');
        setScreen('payment');
      }
    } else if (!fromIdentity) {
      // no payment — submit
    }
  };

  const handleIdentityNext = (data: IdentityData) => {
    setIdentityData(data);
    setDirection(1);
    if (questionFields.length > 0) {
      setCurrentIndex(0);
      setScreen('questions');
    } else if (paymentField) {
      goToPayment(true);
    } else {
      const currentUser = getCurrentUser();
      addResponse(id, buildFinalData(data), currentUser?.id, undefined)
        .catch(() => {})
        .finally(() => { setScreen('success'); });
    }
  };

  if (!form) {
    if (notFound) return (
      <div className="fixed inset-0 flex items-center justify-center text-center px-6">
        <div>
          <div className="text-6xl text-beige-300 mb-6">◈</div>
          <h1 className="text-3xl font-light text-brown-900 mb-3" style={{ fontFamily: 'var(--font-cormorant)' }}>Formulaire introuvable</h1>
        </div>
      </div>
    );
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1.2, ease: 'linear' }}
          className="w-8 h-8 border-2 border-gold-400 border-t-transparent rounded-full" />
      </div>
    );
  }

  const questionFields = form.fields.filter((f) => f.type !== 'payment');
  const paymentField = form.fields.find((f) => f.type === 'payment');
  const currentField = questionFields[currentIndex];
  const realTotal = questionFields.filter(f => f.type !== 'event_date' && f.type !== 'info_block').length;
  const pct = screen === 'payment_choice' || screen === 'payment' ? 100
    : screen === 'questions' ? Math.round(((currentIndex + 1) / Math.max(questionFields.length + 1, 1)) * 90)
    : screen === 'identity' ? 20
    : 0;

  const handleNext = () => {
    if (currentIndex < questionFields.length - 1) {
      setDirection(1); setCurrentIndex((i) => i + 1);
    } else if (paymentField) {
      goToPayment();
    } else {
      const currentUser = getCurrentUser();
      addResponse(id, buildFinalData(identityData!), currentUser?.id, undefined)
        .catch(() => {})
        .finally(() => { setScreen('success'); });
    }
  };

  const handleBack = () => {
    if (currentIndex > 0) {
      setDirection(-1); setCurrentIndex((i) => i - 1);
    } else {
      setDirection(-1); setScreen('identity');
    }
  };

  const handleCash = () => {
    setPaymentMethod('cash');
    const currentUser = getCurrentUser();
    addResponse(id, buildFinalData(identityData!), currentUser?.id, 'cash')
      .catch(() => {})
      .finally(() => { setScreen('success'); });
  };

  const handleCard = () => {
    setPaymentMethod('card');
    setDirection(1);
    setScreen('payment');
  };

  return (
    <div className="fixed inset-0 overflow-hidden bg-beige-50">
      {(screen === 'identity' || screen === 'questions' || screen === 'payment_choice' || screen === 'payment') && (
        <ProgressBar pct={pct} />
      )}

      {/* Musique d'ambiance — active dès le chargement du formulaire */}
      {form.youtubeUrl && <YouTubeAmbiance url={form.youtubeUrl} />}

      <div className="fixed bottom-5 right-5 z-40">
        <span className="text-xs text-brown-300/40" style={{ fontFamily: 'var(--font-cormorant)' }}>HabadLyon</span>
      </div>

      <AnimatePresence mode="wait">
        {screen === 'cover' && (
          <CoverScreen key="cover" form={form} onStart={handleStart} />
        )}

        {screen === 'identity' && (
          <AnimatePresence mode="wait" key="identity-host">
            <IdentityScreen
              key="identity"
              direction={direction}
              onNext={handleIdentityNext}
              onBack={() => { setDirection(-1); setScreen('cover'); }}
            />
          </AnimatePresence>
        )}

        {screen === 'questions' && currentField && (
          <AnimatePresence mode="wait" key="q-host">
            <QuestionScreen
              key={currentField.id}
              field={currentField}
              index={currentIndex}
              total={realTotal}
              value={formData[currentField.id] ?? (currentField.type === 'checkbox' ? false : '')}
              onChange={(v) => setFormData((prev) => ({ ...prev, [currentField.id]: v }))}
              onNext={handleNext}
              onBack={handleBack}
              isLast={currentIndex === questionFields.length - 1 && !paymentField}
              direction={direction}
            />
          </AnimatePresence>
        )}

        {screen === 'payment_choice' && paymentField && (
          <AnimatePresence mode="wait" key="pc-host">
            <PaymentChoiceScreen
              key="payment_choice"
              amount={paymentField.amount ?? 0}
              allowCash={paymentField.allowCash}
              direction={direction}
              onCash={handleCash}
              onCard={handleCard}
              onBack={() => {
                setDirection(-1);
                if (questionFields.length > 0) {
                  setCurrentIndex(questionFields.length - 1);
                  setScreen('questions');
                } else {
                  setScreen('identity');
                }
              }}
            />
          </AnimatePresence>
        )}

        {screen === 'payment' && paymentField && (
          <motion.div key="payment" className="absolute inset-0 overflow-y-auto"
            initial={{ y: '100%' }} animate={{ y: '0%', transition: SPRING }}
            exit={{ y: '-100%', transition: { ...SPRING, stiffness: 340 } }}>
            <div className="min-h-full flex items-start justify-center px-6 py-16">
              <div className="w-full max-w-md">
                <button onClick={() => { setDirection(-1); setScreen('payment_choice'); }}
                  className="mb-6 text-xs text-brown-400 hover:text-brown-700 transition-colors flex items-center gap-1">← Retour</button>
                <h2 className="text-4xl font-light text-brown-900 mb-2" style={{ fontFamily: 'var(--font-cormorant)' }}>Paiement sécurisé</h2>
                <p className="text-brown-400 text-sm mb-8">{paymentField.label} · {paymentField.amount?.toFixed(2)} €</p>
                <StripePayment
                  amount={paymentField.amount ?? 50}
                  description={form.title}
                  onSuccess={() => {
                    const currentUser = getCurrentUser();
                    addResponse(id, { ...buildFinalData(identityData!), payment_status: 'paid' }, currentUser?.id, 'card')
                      .catch(() => {})
                      .finally(() => { setScreen('success'); });
                  }}
                />
                <div className="h-10" />
              </div>
            </div>
          </motion.div>
        )}

        {screen === 'success' && <SuccessScreen key="success" paymentMethod={paymentMethod} />}
      </AnimatePresence>
    </div>
  );
}
