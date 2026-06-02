'use client';
import { use, useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { getForm, addResponse, getCurrentUser } from '@/lib/store'; // getCurrentUser used inside submitForm
import { Form, FormField, PromoCode, TableOption } from '@/lib/types';
import { extractYouTubeId, parseEventDate, downloadICS } from '@/lib/utils';
import dynamic from 'next/dynamic';
import Image from 'next/image';
import Link from 'next/link';
import QRCode from 'qrcode';

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
  email: string;
  phone: string;
  address: string;
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

/* ─── Progress bar + étapes ─────────────────────────────────── */
function ProgressBar({ pct, steps, active }: { pct: number; steps?: string[]; active?: number }) {
  return (
    <div className="fixed top-0 left-0 right-0 z-50">
      <div className="h-1 bg-beige-200/60">
        <motion.div
          className="h-full bg-gradient-to-r from-gold-500 via-gold-400 to-gold-300"
          style={{ boxShadow: '0 0 12px rgba(201,169,110,0.6)' }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        />
      </div>

      {/* Étapes numérotées (1·2·3) */}
      {steps && steps.length > 1 && typeof active === 'number' && (
        <div className="flex items-center justify-center gap-2 sm:gap-3 mt-3 px-4">
          {steps.map((label, i) => {
            const done = i < active;
            const current = i === active;
            return (
              <div key={label} className="flex items-center gap-2 sm:gap-3">
                <div className="flex items-center gap-1.5">
                  <motion.div
                    initial={false}
                    animate={{
                      backgroundColor: done || current ? 'var(--color-gold-400)' : 'var(--color-beige-200)',
                      scale: current ? 1.1 : 1,
                    }}
                    className="w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-semibold flex-shrink-0"
                    style={{ color: done || current ? '#fff' : 'var(--color-brown-400)' }}
                  >
                    {done ? '✓' : i + 1}
                  </motion.div>
                  <span className={`text-[11px] sm:text-xs whitespace-nowrap transition-colors ${current ? 'text-brown-900 font-medium' : 'text-brown-400'}`}>
                    {label}
                  </span>
                </div>
                {i < steps.length - 1 && <div className={`w-4 sm:w-8 h-px ${done ? 'bg-gold-400' : 'bg-beige-300'}`} />}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ─── Cover / Flyer screen ──────────────────────────────────── */
function shareCurrentPage(title: string) {
  if (typeof window === 'undefined') return;
  const url = window.location.href;
  if (typeof navigator !== 'undefined' && navigator.share) {
    navigator.share({ title, url }).catch(() => {});
  } else {
    window.open(`https://wa.me/?text=${encodeURIComponent(`${title}\n${url}`)}`, '_blank');
  }
}

function CoverScreen({ form, onStart, isFull, participants = 0, estMinutes = 2, seatsLeft }: {
  form: Form; onStart: () => void; isFull?: boolean; participants?: number; estMinutes?: number; seatsLeft?: number | null;
}) {
  const eventDateField = form.fields.find((f) => f.type === 'event_date');
  const ctaLabel = isFull ? "Rejoindre la liste d'attente" : 'Commencer';

  // Métadonnées de réassurance — donnent envie de remplir (preuve sociale, temps, sécurité)
  const metaPills = (dark: boolean) => {
    const base = dark
      ? 'bg-white/10 border-white/15 text-beige-100'
      : 'bg-beige-100 border-beige-200 text-brown-600';
    return (
      <div className="flex flex-wrap items-center gap-2 mb-6">
        {participants > 0 && (
          <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-medium ${base}`}>
            ✦ {participants} {participants > 1 ? 'déjà inscrits' : 'déjà inscrit'}
          </span>
        )}
        <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-medium ${base}`}>
          ⏱ ~{estMinutes} min
        </span>
        <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-medium ${base}`}>
          🔒 Sécurisé
        </span>
        {typeof seatsLeft === 'number' && seatsLeft > 0 && seatsLeft <= 20 && (
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-gold-400/40 bg-gold-400/15 text-gold-700 text-xs font-semibold">
            🔥 Plus que {seatsLeft} place{seatsLeft > 1 ? 's' : ''}
          </span>
        )}
      </div>
    );
  };

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
              {isFull && (
                <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-red-500/25 backdrop-blur-sm border border-red-300/40 text-red-50 text-sm font-medium mb-4 mr-2">
                  ● Complet — liste d&apos;attente
                </div>
              )}
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
                <p className="text-beige-300 text-base max-w-lg mb-6 leading-relaxed">{form.description}</p>
              )}
              {metaPills(true)}
              <motion.button onClick={onStart}
                className="inline-flex items-center gap-3 px-10 py-4 bg-beige-50 text-brown-900 rounded-2xl font-semibold text-base shadow-2xl"
                whileHover={{ scale: 1.04, y: -2 }} whileTap={{ scale: 0.97 }}
              >
                {ctaLabel}
                <motion.span animate={{ x: [0, 5, 0] }} transition={{ repeat: Infinity, duration: 1.5 }}>→</motion.span>
              </motion.button>
              <div className="mt-4 flex items-center gap-4">
                <p className="hidden sm:block text-beige-400/40 text-xs">Entrée ↵</p>
                <button onClick={() => shareCurrentPage(form.title)}
                  className="text-beige-200/80 hover:text-beige-50 text-xs underline underline-offset-2 transition-colors"
                  aria-label="Partager cet événement">↗ Partager</button>
              </div>
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
            {isFull && (
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-red-50 border border-red-200 text-red-600 text-sm mb-6 mr-2">
                ● Complet — liste d&apos;attente
              </div>
            )}
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
              <p className="text-brown-500 text-lg mb-8 leading-relaxed">{form.description}</p>
            )}
            <div className="flex justify-center">{metaPills(false)}</div>
            <motion.button onClick={onStart}
              className="btn-liquid inline-flex items-center gap-3 px-10 py-4 bg-brown-900 text-beige-50 rounded-2xl font-medium text-base overflow-hidden"
              whileHover={{ scale: 1.04, y: -3 }} whileTap={{ scale: 0.97 }}>
              <span className="relative z-10 flex items-center gap-3">
                {ctaLabel}
                <motion.span animate={{ x: [0, 5, 0] }} transition={{ repeat: Infinity, duration: 1.5 }}>→</motion.span>
              </span>
            </motion.button>
            <div className="mt-5 flex items-center justify-center gap-4">
              <p className="hidden sm:block text-brown-300 text-xs">Entrée ↵</p>
              <button onClick={() => shareCurrentPage(form.title)}
                className="text-brown-400 hover:text-brown-700 text-xs underline underline-offset-2 transition-colors"
                aria-label="Partager cet événement">↗ Partager</button>
            </div>
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
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [hp, setHp] = useState(''); // honeypot anti-spam (invisible aux humains)
  const [emailTouched, setEmailTouched] = useState(false);
  const [phoneTouched, setPhoneTouched] = useState(false);
  const slide = makeSlide(direction);

  // Validation en temps réel
  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  const phoneDigits = phone.replace(/\D/g, '');
  const phoneValid = phoneDigits.length >= 8;
  const emailError = emailTouched && email.trim() !== '' && !emailValid;
  const phoneError = phoneTouched && phone.trim() !== '' && !phoneValid;

  const canProceed = civility !== '' && firstName.trim() !== '' && lastName.trim() !== '' && emailValid && phoneValid;

  const handleSubmit = () => {
    if (!canProceed) return;
    if (hp) return; // champ piège rempli → bot, on ignore silencieusement
    onNext({
      civility: civility as 'M.' | 'Mme',
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      email: email.trim(),
      phone: phone.trim(),
      address: address.trim(),
    });
  };

  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Enter' && canProceed) handleSubmit(); };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canProceed]);

  return (
    <motion.div
      key="identity"
      initial={slide.enter}
      animate={slide.center}
      exit={slide.exit}
      className="absolute inset-0 flex items-center justify-center overflow-y-auto"
    >
      <div className="w-full max-w-lg mx-auto px-5 py-20">
        <div className="rounded-3xl bg-beige-50 border border-beige-200 shadow-[0_30px_80px_rgba(44,24,16,0.07)] p-7 sm:p-9">
        <h2 className="text-3xl sm:text-4xl font-light text-brown-900 mb-1" style={{ fontFamily: 'var(--font-cormorant)' }}>
          Vos informations
        </h2>
        <p className="text-brown-400 text-sm mb-7">Pour finaliser votre inscription.</p>

        {/* Honeypot anti-spam — invisible, ne pas remplir */}
        <input
          type="text" name="company" value={hp} onChange={(e) => setHp(e.target.value)}
          tabIndex={-1} autoComplete="off" aria-hidden="true"
          style={{ position: 'absolute', left: '-9999px', width: 1, height: 1, opacity: 0 }}
        />

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
            className="w-full px-4 py-3.5 rounded-xl bg-beige-100 border border-beige-200 text-brown-900 text-base focus:outline-none focus:border-gold-400 focus:bg-beige-50 transition-colors placeholder:text-beige-400"
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
            className="w-full px-4 py-3.5 rounded-xl bg-beige-100 border border-beige-200 text-brown-900 text-base focus:outline-none focus:border-gold-400 focus:bg-beige-50 transition-colors placeholder:text-beige-400"
            placeholder="Votre nom de famille"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
          />
        </div>

        {/* Email */}
        <div className="mb-7">
          <label className="text-xs text-brown-400 uppercase tracking-wide mb-2 block font-medium">Email</label>
          <div className="relative">
            <input
              className={`w-full px-4 py-3.5 rounded-xl bg-beige-100 border text-brown-900 text-base focus:outline-none focus:bg-beige-50 transition-colors placeholder:text-beige-400 ${
                emailError ? 'border-red-300 focus:border-red-400' : emailValid ? 'border-green-300 focus:border-green-400' : 'border-beige-200 focus:border-gold-400'
              }`}
              placeholder="votre@email.com"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onBlur={() => setEmailTouched(true)}
              inputMode="email"
            />
            {emailValid && <span className="absolute right-4 top-1/2 -translate-y-1/2 text-green-500 text-sm">✓</span>}
          </div>
          {emailError && <p className="mt-1.5 text-xs text-red-500">Adresse e-mail invalide.</p>}
        </div>

        {/* Téléphone */}
        <div className="mb-7">
          <label className="text-xs text-brown-400 uppercase tracking-wide mb-2 block font-medium">Téléphone</label>
          <div className="relative">
            <input
              className={`w-full px-4 py-3.5 rounded-xl bg-beige-100 border text-brown-900 text-base focus:outline-none focus:bg-beige-50 transition-colors placeholder:text-beige-400 ${
                phoneError ? 'border-red-300 focus:border-red-400' : phoneValid ? 'border-green-300 focus:border-green-400' : 'border-beige-200 focus:border-gold-400'
              }`}
              placeholder="06 12 34 56 78"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              onBlur={() => setPhoneTouched(true)}
              inputMode="tel"
            />
            {phoneValid && <span className="absolute right-4 top-1/2 -translate-y-1/2 text-green-500 text-sm">✓</span>}
          </div>
          {phoneError && <p className="mt-1.5 text-xs text-red-500">Numéro de téléphone invalide (8 chiffres min.).</p>}
        </div>

        {/* Adresse */}
        <div className="mb-10">
          <label className="text-xs text-brown-400 uppercase tracking-wide mb-2 block font-medium">
            Adresse <span className="normal-case text-brown-300">(optionnel)</span>
          </label>
          <input
            className="w-full px-4 py-3.5 rounded-xl bg-beige-100 border border-beige-200 text-brown-900 text-base focus:outline-none focus:border-gold-400 focus:bg-beige-50 transition-colors placeholder:text-beige-400"
            placeholder="12 rue des Acacia, Lyon"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
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

        {/* Bandeau de confiance — rassure au moment de donner ses infos */}
        <div className="mt-6 pt-5 border-t border-beige-200 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[11px] text-brown-400">
          <span className="inline-flex items-center gap-1.5">🔒 Paiement 100% sécurisé</span>
          <span className="inline-flex items-center gap-1.5">🛡️ Vos informations restent privées</span>
          <span className="inline-flex items-center gap-1.5">✉️ Confirmation immédiate par e-mail</span>
        </div>
        </div>
      </div>
    </motion.div>
  );
}

/* ─── Micro-célébration : éclat de particules dorées à la sélection ─── */
function Burst() {
  const particles = Array.from({ length: 8 }, (_, i) => (i / 8) * Math.PI * 2);
  return (
    <div className="absolute inset-0 pointer-events-none flex items-center justify-center overflow-visible">
      {particles.map((angle, i) => (
        <motion.span
          key={i}
          className="absolute w-1.5 h-1.5 rounded-full"
          style={{ background: i % 2 ? '#E8C97E' : '#C9A96E' }}
          initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
          animate={{ x: Math.cos(angle) * 34, y: Math.sin(angle) * 34, opacity: 0, scale: 0.3 }}
          transition={{ duration: 0.55, ease: 'easeOut' }}
        />
      ))}
    </div>
  );
}

/* ─── People count field ────────────────────────────────────── */
function PeopleCountField({ value, onChange, max = 8 }: { value: string; onChange: (v: string) => void; max?: number }) {
  const count = parseInt(value || '0', 10);
  const [burst, setBurst] = useState<number | null>(null);
  const pick = (n: number) => { onChange(String(n)); setBurst(n); setTimeout(() => setBurst(null), 600); };
  return (
    <div className="mt-2">
      <div className="flex flex-wrap gap-3">
        {Array.from({ length: max }, (_, i) => i + 1).map((n) => (
          <motion.button key={n} type="button" onClick={() => pick(n)}
            className={`relative flex flex-col items-center justify-center w-16 h-16 rounded-2xl border-2 font-medium transition-all ${
              count === n ? 'border-gold-500 bg-gold-400/15 text-brown-900' : 'border-beige-200 bg-beige-50 text-brown-500 hover:border-gold-400/50'
            }`}
            whileHover={{ scale: 1.1, y: -2 }} whileTap={{ scale: 0.92 }}
            initial={{ opacity: 0, scale: 0.7 }} animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: n * 0.04, type: 'spring', stiffness: 400, damping: 18 }}>
            {burst === n && <Burst />}
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

/* ─── Table reservation (Gala) ──────────────────────────────── */
/** Décode la valeur stockée d'une réservation de table : { i: index option, q: quantité } */
export function parseTableSelection(value: unknown): { i: number; q: number } {
  if (typeof value === 'string' && value) {
    try {
      const p = JSON.parse(value);
      const i = typeof p.i === 'number' ? p.i : -1;
      const q = typeof p.q === 'number' && p.q > 0 ? p.q : 1;
      return { i, q };
    } catch { /* ignore */ }
  }
  return { i: -1, q: 1 };
}

function TableReservationField({
  field, value, onChange,
}: { field: FormField; value: string; onChange: (v: string) => void }) {
  const options: TableOption[] = field.tableOptions ?? [];
  const sel = parseTableSelection(value);
  const [burst, setBurst] = useState<number | null>(null);
  const setSel = (i: number, q: number) => onChange(JSON.stringify({ i, q: Math.max(1, q) }));
  const pick = (i: number) => { setSel(i, sel.i === i ? sel.q : 1); setBurst(i); setTimeout(() => setBurst(null), 600); };
  const chosen = sel.i >= 0 ? options[sel.i] : undefined;
  const subtotal = chosen ? chosen.price * sel.q : 0;
  // L'option la plus "généreuse" (prix le plus élevé) = mise en avant comme populaire
  const popularIdx = options.length > 1 ? options.reduce((best, o, idx) => o.price > options[best].price ? idx : best, 0) : -1;

  return (
    <div className="mt-2 space-y-3">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {options.map((opt, i) => (
          <motion.button
            key={i} type="button"
            onClick={() => pick(i)}
            className={`relative text-left rounded-2xl border-2 px-5 py-4 transition-colors ${
              sel.i === i ? 'border-gold-500 bg-gold-400/10' : 'border-beige-200 bg-beige-50 hover:border-gold-400/50'
            }`}
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 + i * 0.07 }}
            whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
          >
            {burst === i && <Burst />}
            {i === popularIdx && (
              <span className="absolute -top-2 right-4 px-2 py-0.5 rounded-full bg-gold-500 text-beige-50 text-[10px] font-semibold shadow">★ Premium</span>
            )}
            <div className="flex items-center gap-3">
              <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                sel.i === i ? 'border-gold-500' : 'border-beige-300'
              }`}>
                {sel.i === i && <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="w-3 h-3 rounded-full bg-gold-500" />}
              </div>
              <div className="min-w-0">
                <p className={`text-base font-medium ${sel.i === i ? 'text-brown-900' : 'text-brown-600'}`}>{opt.label}</p>
                <p className="text-xs text-brown-400 mt-0.5">
                  {opt.seats} place{opt.seats > 1 ? 's' : ''} · {opt.price} €
                </p>
              </div>
            </div>
          </motion.button>
        ))}
      </div>

      {chosen && (
        <motion.div
          initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between gap-4 rounded-2xl border border-beige-200 bg-beige-50 px-5 py-4"
        >
          <div>
            <p className="text-xs text-brown-400 uppercase tracking-wide">Quantité</p>
            <p className="text-sm text-brown-600 mt-0.5">{chosen.seats * sel.q} place{chosen.seats * sel.q > 1 ? 's' : ''} au total</p>
          </div>
          <div className="flex items-center gap-3">
            <button type="button" onClick={() => setSel(sel.i, sel.q - 1)}
              className="w-9 h-9 rounded-full border-2 border-beige-300 text-brown-600 hover:border-gold-400 transition-colors flex items-center justify-center text-lg leading-none disabled:opacity-40"
              disabled={sel.q <= 1} aria-label="Diminuer">−</button>
            <span className="w-6 text-center font-semibold text-brown-900">{sel.q}</span>
            <button type="button" onClick={() => setSel(sel.i, sel.q + 1)}
              className="w-9 h-9 rounded-full border-2 border-beige-300 text-brown-600 hover:border-gold-400 transition-colors flex items-center justify-center text-lg leading-none" aria-label="Augmenter">+</button>
          </div>
        </motion.div>
      )}

      {chosen && (
        <p className="text-right text-brown-600 text-sm">
          Sous-total : <span className="font-semibold text-brown-900">{subtotal.toFixed(2)} €</span>
        </p>
      )}
    </div>
  );
}

/* ─── Donation ──────────────────────────────────────────────── */
function DonationField({
  field, value, onChange,
}: { field: FormField; value: string; onChange: (v: string) => void }) {
  const suggested = field.suggestedAmounts ?? [];
  const isCustom = value !== '' && !suggested.map(String).includes(value);
  const [burst, setBurst] = useState<number | null>(null);
  const pick = (amt: number) => { onChange(String(amt)); setBurst(amt); setTimeout(() => setBurst(null), 600); };
  return (
    <div className="mt-2 space-y-3">
      <div className="flex flex-wrap gap-3">
        {suggested.map((amt, i) => (
          <motion.button
            key={i} type="button"
            onClick={() => pick(amt)}
            className={`relative px-6 py-4 rounded-2xl border-2 font-medium transition-colors ${
              value === String(amt) ? 'border-gold-500 bg-gold-400/15 text-brown-900' : 'border-beige-200 bg-beige-50 text-brown-600 hover:border-gold-400/50'
            }`}
            initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1 + i * 0.05 }}
            whileHover={{ scale: 1.05, y: -2 }} whileTap={{ scale: 0.95 }}
          >
            {burst === amt && <Burst />}
            {amt} €
          </motion.button>
        ))}
      </div>
      {field.allowCustomAmount && (
        <div className={`flex items-center gap-2 rounded-2xl border-2 px-5 py-3 max-w-xs transition-colors ${
          isCustom ? 'border-gold-500 bg-gold-400/10' : 'border-beige-200 bg-beige-50'
        }`}>
          <input
            type="number" min="1" inputMode="numeric"
            placeholder="Autre montant"
            className="flex-1 bg-transparent text-brown-900 text-lg font-light focus:outline-none placeholder:text-beige-300 w-full"
            value={isCustom ? value : ''}
            onChange={(e) => onChange(e.target.value === '' ? '' : String(parseFloat(e.target.value) || ''))}
          />
          <span className="text-brown-400">€</span>
        </div>
      )}

      {/* Réduction fiscale — fort levier de générosité (art. 200 CGI, 66%) */}
      {(() => {
        const amt = parseFloat(value || '0') || 0;
        if (amt <= 0) return null;
        const realCost = Math.round(amt * 0.34 * 100) / 100;
        return (
          <motion.div
            initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
            className="mt-2 rounded-2xl bg-gold-400/10 border border-gold-400/20 p-4 max-w-md"
          >
            <p className="text-sm text-brown-800">
              🙏 Merci pour votre générosité !
            </p>
            <p className="text-xs text-brown-500 mt-1">
              Votre don de <span className="font-semibold text-brown-800">{amt} €</span> ne vous coûte réellement que{' '}
              <span className="font-semibold text-gold-700">{realCost} €</span> après réduction d&apos;impôt (66%).
            </p>
          </motion.div>
        );
      })()}
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

/* ─── Choix du menu par convive (#39) ───────────────────────────
   Stocke une chaîne lisible : "Convive 1 : Viande · Convive 2 : Poisson"
   (lisible directement par l'admin dans les réponses). */
export function encodePerGuest(map: Record<number, string>, count: number): string {
  const parts: string[] = [];
  for (let g = 1; g <= count; g++) {
    if (map[g]) parts.push(`Convive ${g} : ${map[g]}`);
  }
  return parts.join(' · ');
}
function decodePerGuest(value: string): Record<number, string> {
  const map: Record<number, string> = {};
  (value || '').split(' · ').forEach((seg) => {
    const m = seg.match(/^Convive (\d+) : (.+)$/);
    if (m) map[parseInt(m[1], 10)] = m[2];
  });
  return map;
}

function PerGuestChoice({ field, guestCount, value, onChange }: {
  field: FormField; guestCount: number; value: string; onChange: (v: string) => void;
}) {
  const map = decodePerGuest(value);
  const select = (guest: number, label: string) => {
    const next = { ...map, [guest]: label };
    onChange(encodePerGuest(next, guestCount));
  };
  return (
    <div className="mt-2 space-y-6">
      {Array.from({ length: guestCount }, (_, gi) => gi + 1).map((g) => (
        <div key={g}>
          <p className="text-sm font-medium text-brown-500 mb-2">Convive {g}</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {(field.options ?? []).map((opt) => {
              const active = map[g] === opt.label;
              return (
                <motion.button key={opt.label} type="button" onClick={() => select(g, opt.label)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl border-2 text-left transition-colors ${
                    active ? 'border-gold-500 bg-gold-400/10' : 'border-beige-200 bg-beige-50 hover:border-gold-400/50'
                  }`}
                  whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.98 }}>
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${active ? 'border-gold-500' : 'border-beige-300'}`}>
                    {active && <div className="w-2.5 h-2.5 rounded-full bg-gold-500" />}
                  </div>
                  <span className={`text-sm font-medium ${active ? 'text-brown-900' : 'text-brown-600'}`}>{opt.label}</span>
                </motion.button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

/* ─── Question screen ───────────────────────────────────────── */
function QuestionScreen({
  field, index, total, value, onChange, onNext, onBack, isLast, direction, guestCount = 1, firstName = '',
}: {
  field: FormField; index: number; total: number;
  value: string | boolean; onChange: (v: string | boolean) => void;
  onNext: () => void; onBack: () => void; isLast: boolean; direction: number; guestCount?: number; firstName?: string;
}) {
  const usePerGuest = (field.type === 'radio' || field.type === 'select') && !!field.perGuest && guestCount > 1;
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement | null>(null);
  const slide = makeSlide(direction);
  const isAutoAdvance = field.type === 'event_date' || field.type === 'info_block';

  useEffect(() => {
    const el = inputRef.current;
    if (el) setTimeout(() => el.focus(), 380);
  }, [field.id]);

  const perGuestComplete = usePerGuest
    ? Object.keys(decodePerGuest(value as string)).length >= guestCount
    : true;
  const canProceed = isAutoAdvance ||
    (usePerGuest
      ? (!field.required || perGuestComplete)
      : (!field.required || (field.type === 'checkbox' ? value === true : value !== '' && value !== false)));

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Enter' && field.type !== 'textarea' && canProceed) {
        e.preventDefault();
        onNext();
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canProceed, field.type, onNext]);

  const baseInput = 'w-full px-5 py-4 rounded-2xl bg-beige-100 border border-beige-200 text-brown-900 text-xl sm:text-2xl font-light focus:outline-none focus:border-gold-400 focus:bg-beige-50 transition-colors duration-200 placeholder:text-beige-400 text-center';

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
          <div className="flex items-center justify-between gap-3 mb-8">
            <span className="inline-flex items-center gap-2 text-sm">
              <span className="text-gold-500 font-medium tabular-nums">Question {Math.min(index + 1, total)}</span>
              <span className="text-brown-300">/ {total}</span>
            </span>
            <motion.span
              key={isLast ? 'last' : 'cont'}
              initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }}
              className="text-xs text-gold-600 font-medium">
              {isLast ? '✦ Dernière étape !' : firstName ? `Continuez, ${firstName} ✦` : 'Vous y êtes presque ✦'}
            </motion.span>
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
              className="w-full px-5 py-4 rounded-2xl bg-beige-100 border border-beige-200 text-brown-900 text-lg font-light focus:outline-none focus:border-gold-400 focus:bg-beige-50 transition-colors duration-200 placeholder:text-beige-400 resize-none"
              placeholder={field.placeholder ?? 'Votre réponse ici…'} rows={4}
              value={value as string} onChange={(e) => onChange(e.target.value)} />
          )}

          {field.type === 'people_count' && (
            <PeopleCountField value={value as string} onChange={onChange} max={field.maxPeople ?? 8} />
          )}

          {field.type === 'table_reservation' && (
            <TableReservationField field={field} value={value as string} onChange={onChange} />
          )}

          {field.type === 'donation' && (
            <DonationField field={field} value={value as string} onChange={onChange} />
          )}

          {(field.type === 'radio' || field.type === 'select') && usePerGuest && (
            <PerGuestChoice field={field} guestCount={guestCount} value={value as string} onChange={onChange} />
          )}

          {(field.type === 'radio' || field.type === 'select') && !usePerGuest && (
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
            <span className="hidden sm:inline text-xs text-brown-300 ml-auto">Entrée ↵</span>
          )}
        </div>
      </div>
    </motion.div>
  );
}

/* ─── Payment choice screen ─────────────────────────────────── */
function PaymentChoiceScreen({
  amount, onCash, onCard, onBack, direction, allowCash, recap, firstName = '',
}: {
  amount: number; onCash: () => void; onCard: () => void; onBack: () => void; direction: number; allowCash?: boolean;
  recap?: { lines: { label: string; value: string }[]; discount?: { label: string; value: string }; total: number };
  firstName?: string;
}) {
  const slide = makeSlide(direction);
  return (
    <motion.div
      key="payment_choice"
      initial={slide.enter}
      animate={slide.center}
      exit={slide.exit}
      className="absolute inset-0 flex items-center justify-center overflow-y-auto px-6 py-16"
    >
      <div className="w-full max-w-md">
        <button onClick={onBack} className="mb-6 text-xs text-brown-400 hover:text-brown-700 transition-colors flex items-center gap-1">
          ← Retour
        </button>
        <motion.p initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
          className="text-sm text-gold-600 font-medium mb-1">
          {firstName ? `Dernière étape, ${firstName} 🎉` : 'Dernière étape 🎉'}
        </motion.p>
        <h2 className="text-4xl sm:text-5xl font-light text-brown-900 mb-6" style={{ fontFamily: 'var(--font-cormorant)' }}>
          Mode de paiement
        </h2>

        {/* Récapitulatif (#36) */}
        {recap && recap.lines.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
            className="mb-8 rounded-2xl bg-beige-100 border border-beige-200 p-5"
          >
            <p className="text-xs uppercase tracking-widest text-brown-400 mb-3">Récapitulatif</p>
            <div className="space-y-2">
              {recap.lines.map((l, i) => (
                <div key={i} className="flex items-start justify-between gap-3 text-sm">
                  <span className="text-brown-600">{l.label}</span>
                  <span className="text-brown-900 font-medium whitespace-nowrap">{l.value}</span>
                </div>
              ))}
              {recap.discount && (
                <div className="flex items-center justify-between gap-3 text-sm text-green-700">
                  <span>{recap.discount.label}</span>
                  <span className="font-medium whitespace-nowrap">{recap.discount.value}</span>
                </div>
              )}
            </div>
            <div className="mt-3 pt-3 border-t border-beige-300 flex items-center justify-between">
              <span className="text-sm font-medium text-brown-700">Total à payer</span>
              <span className="text-xl font-semibold text-brown-900">{recap.total.toFixed(2)} €</span>
            </div>
          </motion.div>
        )}

        {!recap && (
          <p className="text-brown-400 text-sm mb-10">Montant total : <span className="font-semibold text-brown-700">{amount.toFixed(2)} €</span></p>
        )}

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
function SuccessScreen({ paymentMethod, ticketId, isWaitlist, form }: { paymentMethod?: 'card' | 'cash'; ticketId?: string | null; isWaitlist?: boolean; form?: Form }) {
  const [qr, setQr] = useState<string>('');
  const [loggedIn, setLoggedIn] = useState(true);

  const eventDateField = form?.fields.find((f) => f.type === 'event_date');
  const eventDate = parseEventDate(eventDateField?.presetValue);
  const canShare = typeof navigator !== 'undefined' && !!(navigator as Navigator).share;

  const handleShare = () => {
    if (typeof window === 'undefined' || !form) return;
    const url = `${window.location.origin}/forms/${form.id}`;
    const text = `${form.title} — HabadLyon`;
    if (canShare) (navigator as Navigator).share({ title: form.title, text, url }).catch(() => {});
    else window.open(`https://wa.me/?text=${encodeURIComponent(`${text}\n${url}`)}`, '_blank');
  };

  useEffect(() => {
    setLoggedIn(!!getCurrentUser());
  }, []);

  useEffect(() => {
    if (!ticketId || isWaitlist) return;
    const url = `${window.location.origin}/billet/${ticketId}`;
    QRCode.toDataURL(url, { margin: 1, width: 320, color: { dark: '#2C1810', light: '#FAF7F2' } })
      .then(setQr)
      .catch(() => {});
  }, [ticketId, isWaitlist]);

  return (
    <motion.div key="success" className="absolute inset-0 overflow-y-auto flex flex-col items-center justify-center px-6 py-16 text-center"
      initial={{ y: '100%' }} animate={{ y: '0%', transition: SPRING }} exit={{ y: '-100%' }}>
      <motion.div initial={{ scale: 0, rotate: -20 }} animate={{ scale: 1, rotate: 0 }}
        transition={{ type: 'spring', stiffness: 200, damping: 15, delay: 0.15 }}
        className="text-7xl text-gold-400 mb-6 select-none">✦</motion.div>

      {CONFETTI.map((p, i) => (
        <motion.div key={i} className="absolute rounded-full bg-gold-400/40"
          style={{ width: p.width, height: p.height, top: '40%', left: '50%' }}
          initial={{ x: 0, y: 0, opacity: 1 }}
          animate={{ x: p.animX, y: p.animY, opacity: 0 }}
          transition={{ duration: 1.4, delay: 0.3 + i * 0.03, ease: [0.22, 1, 0.36, 1] }} />
      ))}

      <motion.h2 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3, duration: 0.6 }}
        className="text-[clamp(2.2rem,6vw,4rem)] font-light text-brown-900 leading-tight mb-3"
        style={{ fontFamily: 'var(--font-cormorant)' }}>
        {isWaitlist ? 'Vous êtes sur la liste d’attente.' : 'Inscription confirmée.'}
      </motion.h2>
      <motion.p initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.45 }}
        className="text-brown-500 text-base max-w-sm mb-8">
        {isWaitlist
          ? 'L’événement est complet. Nous vous contacterons dès qu’une place se libère.'
          : paymentMethod === 'cash'
          ? 'Votre inscription est enregistrée. Le paiement sera effectué sur place.'
          : paymentMethod === 'card'
          ? 'Votre réservation et paiement ont bien été confirmés.'
          : 'Votre réponse a bien été enregistrée.'}
      </motion.p>

      {/* Billet avec QR code */}
      {qr && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.6, duration: 0.5 }}
          className="rounded-3xl bg-beige-50 border border-beige-200 p-6 shadow-sm"
        >
          <p className="text-xs uppercase tracking-widest text-brown-400 mb-3">Votre billet d&apos;entrée</p>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={qr} alt="QR code de votre billet" className="w-44 h-44 mx-auto rounded-xl" />
          <p className="mt-3 text-xs text-brown-500 max-w-[200px]">
            Présentez ce QR code à l&apos;entrée. Conservez cette page ou votre email.
          </p>
        </motion.div>
      )}

      {/* Actions : agenda + partage */}
      {!isWaitlist && (eventDate || form) && (
        <motion.div
          initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.7 }}
          className="mt-7 flex flex-wrap items-center justify-center gap-3"
        >
          {eventDate && form && (
            <button
              onClick={() => downloadICS(form.title, eventDate, eventDateField?.venue)}
              className="inline-flex items-center gap-2 px-5 py-3 rounded-full bg-brown-900 text-beige-50 text-sm font-medium hover:bg-brown-800 transition-colors"
            >
              📅 Ajouter à mon agenda
            </button>
          )}
          {form && (
            <button
              onClick={handleShare}
              className="inline-flex items-center gap-2 px-5 py-3 rounded-full border border-gold-400/40 text-brown-800 text-sm font-medium hover:bg-gold-400/10 transition-colors"
            >
              ↗ Partager
            </button>
          )}
        </motion.div>
      )}

      {!loggedIn && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.8 }}
          className="mt-6 text-center"
        >
          <p className="text-xs text-brown-400 mb-2">Créez un compte pour retrouver vos billets et reçus.</p>
          <Link href="/register" className="text-sm font-medium text-gold-700 hover:text-gold-600 underline underline-offset-2">
            Créer mon compte →
          </Link>
        </motion.div>
      )}

      {/* Navigation de sortie */}
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.9 }}
        className="mt-8 flex items-center justify-center gap-5 text-sm"
      >
        <Link href="/events" className="text-brown-600 hover:text-brown-900 transition-colors">← Autres événements</Link>
        <Link href="/" className="text-brown-400 hover:text-brown-700 transition-colors">Accueil</Link>
      </motion.div>
    </motion.div>
  );
}

/* ─── Disabled screen ───────────────────────────────────────── */
function DisabledScreen({ title }: { title: string }) {
  return (
    <div className="fixed inset-0 flex flex-col items-center justify-center px-6 text-center bg-beige-50">
      <motion.div
        initial={{ scale: 0, rotate: -20 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ type: 'spring', stiffness: 200, damping: 18 }}
        className="text-6xl text-beige-300 mb-6"
      >
        🔒
      </motion.div>
      <motion.h2
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="text-3xl font-light text-brown-900 mb-3"
        style={{ fontFamily: 'var(--font-cormorant)' }}
      >
        {title}
      </motion.h2>
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.35 }}
        className="text-brown-400 text-base max-w-xs"
      >
        Ce formulaire est temporairement indisponible. Revenez plus tard.
      </motion.p>
    </div>
  );
}

/* ─── Promo code screen ─────────────────────────────────────── */
function PromoScreen({
  promoCodes,
  paymentAmount,
  onApply,
  onSkip,
  direction,
}: {
  promoCodes: PromoCode[];
  paymentAmount: number;
  onApply: (promo: PromoCode) => void;
  onSkip: () => void;
  direction: number;
}) {
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [applied, setApplied] = useState<PromoCode | null>(null);
  const slide = makeSlide(direction);

  const handleApply = () => {
    const found = promoCodes.find((p) => p.code.toUpperCase() === code.trim().toUpperCase());
    if (!found) { setError('Code invalide.'); return; }
    if (found.expiresAt) {
      const exp = new Date(found.expiresAt);
      exp.setHours(23, 59, 59, 999);
      if (!isNaN(exp.getTime()) && exp.getTime() < Date.now()) { setError('Ce code a expiré.'); return; }
    }
    setError('');
    setApplied(found);
  };

  const discountAmount = applied
    ? applied.type === 'percent'
      ? Math.round(paymentAmount * applied.discount) / 100
      : applied.discount
    : 0;
  const finalAmount = Math.max(0, paymentAmount - discountAmount);

  return (
    <motion.div
      key="promo"
      initial={slide.enter}
      animate={slide.center}
      exit={slide.exit}
      className="absolute inset-0 flex items-center justify-center px-6"
    >
      <div className="w-full max-w-md">
        <h2 className="text-4xl sm:text-5xl font-light text-brown-900 mb-2" style={{ fontFamily: 'var(--font-cormorant)' }}>
          Code promo
        </h2>
        <p className="text-brown-400 text-sm mb-8">Entrez votre code pour obtenir une réduction.</p>

        {!applied ? (
          <div className="space-y-3 mb-6">
            <div className="flex gap-2">
              <input
                className="flex-1 px-4 py-3 rounded-xl border-2 border-beige-300 focus:border-gold-500 text-brown-900 text-base uppercase tracking-widest focus:outline-none transition-colors bg-transparent"
                placeholder="MONCODE"
                value={code}
                onChange={(e) => { setCode(e.target.value.toUpperCase()); setError(''); }}
                onKeyDown={(e) => e.key === 'Enter' && handleApply()}
                autoFocus
              />
              <motion.button
                onClick={handleApply}
                disabled={!code.trim()}
                className="px-5 py-3 rounded-xl bg-brown-900 text-beige-50 font-medium text-sm disabled:opacity-30"
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
              >
                Appliquer
              </motion.button>
            </div>
            {error && (
              <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-sm text-red-500 px-1">
                ⚠ {error}
              </motion.p>
            )}
          </div>
        ) : (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="mb-6 p-5 rounded-2xl bg-green-50 border border-green-200"
          >
            <div className="flex items-center gap-3 mb-3">
              <span className="text-2xl">✓</span>
              <div>
                <p className="font-semibold text-green-800 text-sm">Code appliqué !</p>
                <p className="text-green-600 text-xs">{applied.code}</p>
              </div>
            </div>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between text-brown-600">
                <span>Prix initial</span><span>{paymentAmount} €</span>
              </div>
              <div className="flex justify-between text-green-700 font-medium">
                <span>Réduction ({applied.type === 'percent' ? `${applied.discount}%` : `${applied.discount}€`})</span>
                <span>−{discountAmount} €</span>
              </div>
              <div className="flex justify-between text-brown-900 font-bold text-base pt-2 border-t border-green-200">
                <span>Total</span><span>{finalAmount} €</span>
              </div>
            </div>
          </motion.div>
        )}

        <div className="flex flex-col gap-3">
          {applied && (
            <motion.button
              onClick={() => onApply(applied)}
              className="btn-liquid w-full py-4 bg-brown-900 text-beige-50 rounded-xl font-medium text-sm overflow-hidden"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.97 }}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <span className="relative z-10">Continuer avec {finalAmount} € →</span>
            </motion.button>
          )}
          <button
            onClick={onSkip}
            className="w-full py-3 text-brown-400 hover:text-brown-700 text-sm transition-colors"
          >
            {applied ? 'Annuler le code' : 'Passer sans code promo →'}
          </button>
        </div>
      </div>
    </motion.div>
  );
}

/* ─── Formulaire « tout sur une page » (scroll unique) ──────────
   Alternative au mode question-par-question : tout est visible,
   on remplit en scrollant, un seul bouton à la fin. */
function ScrollForm({
  form, questionFields, formData, setFormData, guestCount, onSubmit, direction,
}: {
  form: Form;
  questionFields: FormField[];
  formData: Record<string, string | boolean>;
  setFormData: (updater: (prev: Record<string, string | boolean>) => Record<string, string | boolean>) => void;
  guestCount: number;
  onSubmit: (data: IdentityData) => void;
  direction: number;
}) {
  const [civility, setCivility] = useState<'M.' | 'Mme' | ''>('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [hp, setHp] = useState('');
  const [touched, setTouched] = useState(false);
  const slide = makeSlide(direction);

  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  const phoneValid = phone.replace(/\D/g, '').length >= 8;

  const setField = (id: string, v: string | boolean) => setFormData((prev) => ({ ...prev, [id]: v }));

  // Champs question manquants (obligatoires)
  const missingQuestion = (f: FormField): boolean => {
    if (!f.required || f.type === 'event_date' || f.type === 'info_block') return false;
    const v = formData[f.id];
    if (f.type === 'checkbox') return v !== true;
    if (f.type === 'people_count') return !(parseInt((v as string) || '0', 10) > 0);
    if (f.type === 'table_reservation') return parseTableSelection(v).i < 0;
    if (f.type === 'donation') return !(parseFloat((v as string) || '0') > 0);
    return v === undefined || v === '' || v === false;
  };

  const identityOk = civility !== '' && firstName.trim() && lastName.trim() && emailValid && phoneValid;
  const questionsOk = questionFields.every((f) => !missingQuestion(f));
  const canSubmit = !!identityOk && questionsOk;

  const handleSubmit = () => {
    setTouched(true);
    if (hp) return; // bot
    if (!canSubmit) {
      // amène au premier champ manquant
      document.querySelector('[data-invalid="true"]')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }
    onSubmit({ civility: civility as 'M.' | 'Mme', firstName: firstName.trim(), lastName: lastName.trim(), email: email.trim(), phone: phone.trim(), address: address.trim() });
  };

  const inputCls = (invalid?: boolean) =>
    `w-full px-4 py-3.5 rounded-xl bg-beige-100 border text-brown-900 text-base focus:outline-none focus:bg-beige-50 transition-colors placeholder:text-beige-400 ${
      invalid ? 'border-red-300 focus:border-red-400' : 'border-beige-200 focus:border-gold-400'
    }`;
  const sectionLabel = 'text-xs text-brown-400 uppercase tracking-wide mb-2 block font-medium';

  return (
    <motion.div key="scrollform" initial={slide.enter} animate={slide.center} exit={slide.exit}
      className="absolute inset-0 overflow-y-auto">
      <div className="w-full max-w-xl mx-auto px-5 py-20">
        {/* En-tête */}
        <div className="mb-8">
          <h2 className="text-3xl sm:text-4xl font-light text-brown-900 mb-1" style={{ fontFamily: 'var(--font-cormorant)' }}>{form.title}</h2>
          {form.description && <p className="text-brown-400 text-sm">{form.description}</p>}
        </div>

        {/* Honeypot */}
        <input type="text" name="company" value={hp} onChange={(e) => setHp(e.target.value)}
          tabIndex={-1} autoComplete="off" aria-hidden="true" style={{ position: 'absolute', left: '-9999px', width: 1, height: 1, opacity: 0 }} />

        <div className="rounded-3xl bg-beige-50 border border-beige-200 shadow-[0_20px_60px_rgba(44,24,16,0.06)] p-6 sm:p-8 space-y-7">
          {/* ── Identité ── */}
          <div>
            <label className={sectionLabel}>Civilité</label>
            <div className="flex gap-3" data-invalid={touched && !civility ? 'true' : undefined}>
              {(['M.', 'Mme'] as const).map((c) => (
                <button key={c} type="button" onClick={() => setCivility(c)}
                  className={`flex-1 py-3.5 rounded-2xl border-2 font-semibold transition-all ${civility === c ? 'border-gold-500 bg-gold-400/15 text-brown-900' : 'border-beige-200 bg-beige-50 text-brown-500 hover:border-gold-400/50'}`}>
                  {c}
                </button>
              ))}
            </div>
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className={sectionLabel}>Prénom</label>
              <input className={inputCls(touched && !firstName.trim())} data-invalid={touched && !firstName.trim() ? 'true' : undefined}
                placeholder="Votre prénom" value={firstName} onChange={(e) => setFirstName(e.target.value)} />
            </div>
            <div>
              <label className={sectionLabel}>Nom</label>
              <input className={inputCls(touched && !lastName.trim())} data-invalid={touched && !lastName.trim() ? 'true' : undefined}
                placeholder="Votre nom" value={lastName} onChange={(e) => setLastName(e.target.value)} />
            </div>
          </div>
          <div>
            <label className={sectionLabel}>Email</label>
            <input type="email" inputMode="email" className={inputCls(touched && !emailValid)} data-invalid={touched && !emailValid ? 'true' : undefined}
              placeholder="votre@email.com" value={email} onChange={(e) => setEmail(e.target.value)} />
            {touched && email && !emailValid && <p className="mt-1.5 text-xs text-red-500">Adresse e-mail invalide.</p>}
          </div>
          <div>
            <label className={sectionLabel}>Téléphone</label>
            <input inputMode="tel" className={inputCls(touched && !phoneValid)} data-invalid={touched && !phoneValid ? 'true' : undefined}
              placeholder="06 12 34 56 78" value={phone} onChange={(e) => setPhone(e.target.value)} />
            {touched && phone && !phoneValid && <p className="mt-1.5 text-xs text-red-500">Numéro invalide.</p>}
          </div>
          <div>
            <label className={sectionLabel}>Adresse <span className="normal-case text-brown-300">(optionnel)</span></label>
            <input className={inputCls(false)} placeholder="12 rue des Acacia, Lyon" value={address} onChange={(e) => setAddress(e.target.value)} />
          </div>

          {/* ── Questions ── */}
          {questionFields.map((f) => {
            if (f.type === 'event_date') return <div key={f.id}><EventDateDisplay field={f} /></div>;
            if (f.type === 'info_block') return <div key={f.id}><InfoBlock field={f} /></div>;
            const invalid = touched && missingQuestion(f);
            return (
              <div key={f.id} data-invalid={invalid ? 'true' : undefined} className="pt-1 border-t border-beige-200/60">
                <label className="text-base font-medium text-brown-900 mb-3 block" style={{ fontFamily: 'var(--font-cormorant)' }}>
                  {f.label}{f.required && <span className="text-gold-500 ml-1">*</span>}
                </label>
                {f.type === 'people_count' && <PeopleCountField value={(formData[f.id] as string) || ''} onChange={(v) => setField(f.id, v)} max={f.maxPeople ?? 8} />}
                {f.type === 'table_reservation' && <TableReservationField field={f} value={(formData[f.id] as string) || ''} onChange={(v) => setField(f.id, v)} />}
                {f.type === 'donation' && <DonationField field={f} value={(formData[f.id] as string) || ''} onChange={(v) => setField(f.id, v)} />}
                {f.type === 'textarea' && (
                  <textarea rows={4} className="w-full px-4 py-3 rounded-xl bg-beige-100 border border-beige-200 text-brown-900 focus:outline-none focus:border-gold-400 resize-none placeholder:text-beige-400"
                    placeholder={f.placeholder ?? 'Votre réponse…'} value={(formData[f.id] as string) || ''} onChange={(e) => setField(f.id, e.target.value)} />
                )}
                {(f.type === 'text' || f.type === 'email' || f.type === 'phone' || f.type === 'number') && (
                  <input type={f.type === 'number' ? 'number' : 'text'} className={inputCls(invalid)}
                    placeholder={f.placeholder ?? 'Votre réponse'} value={(formData[f.id] as string) || ''} onChange={(e) => setField(f.id, e.target.value)} />
                )}
                {(f.type === 'radio' || f.type === 'select') && (
                  field.perGuestCheck(f, guestCount)
                    ? <PerGuestChoice field={f} guestCount={guestCount} value={(formData[f.id] as string) || ''} onChange={(v) => setField(f.id, v)} />
                    : <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        {(f.options ?? []).map((opt) => {
                          const active = formData[f.id] === opt.label;
                          return (
                            <button key={opt.label} type="button" onClick={() => setField(f.id, opt.label)}
                              className={`flex items-center gap-3 px-4 py-3 rounded-xl border-2 text-left transition-colors ${active ? 'border-gold-500 bg-gold-400/10' : 'border-beige-200 bg-beige-50 hover:border-gold-400/50'}`}>
                              <span className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${active ? 'border-gold-500' : 'border-beige-300'}`}>
                                {active && <span className="w-2.5 h-2.5 rounded-full bg-gold-500" />}
                              </span>
                              <span className={`text-sm font-medium ${active ? 'text-brown-900' : 'text-brown-600'}`}>{opt.label}</span>
                            </button>
                          );
                        })}
                      </div>
                )}
                {f.type === 'checkbox' && (
                  <button type="button" onClick={() => setField(f.id, !formData[f.id])}
                    className={`flex items-center gap-3 px-5 py-3.5 rounded-xl border-2 w-full text-left transition-colors ${formData[f.id] ? 'border-gold-500 bg-gold-400/10' : 'border-beige-200 bg-beige-50 hover:border-gold-400/40'}`}>
                    <span className={`w-6 h-6 rounded-md border-2 flex items-center justify-center flex-shrink-0 ${formData[f.id] ? 'border-gold-500 bg-gold-500' : 'border-beige-300'}`}>
                      {formData[f.id] && <span className="text-beige-50 text-xs font-bold">✓</span>}
                    </span>
                    <span className="text-sm text-brown-700">{f.placeholder || 'Oui, je confirme'}</span>
                  </button>
                )}
              </div>
            );
          })}
        </div>

        {touched && !canSubmit && (
          <p className="mt-4 text-sm text-red-500 text-center">Merci de compléter les champs obligatoires (★).</p>
        )}

        <motion.button type="button" onClick={handleSubmit}
          className="btn-liquid w-full mt-6 py-4 bg-brown-900 text-beige-50 rounded-2xl font-medium overflow-hidden"
          whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.98 }}>
          <span className="relative z-10">Valider mon inscription →</span>
        </motion.button>
        <div className="h-10" />
      </div>
    </motion.div>
  );
}

/* helper pour décider du mode par convive sans dupliquer la logique */
const field = {
  perGuestCheck: (f: FormField, guestCount: number) =>
    (f.type === 'radio' || f.type === 'select') && !!f.perGuest && guestCount > 1,
};

/* ─── Main page ─────────────────────────────────────────────── */
export default function FormPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [form, setForm] = useState<Form | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [screen, setScreen] = useState<'cover' | 'form' | 'identity' | 'questions' | 'promo' | 'payment_choice' | 'payment' | 'success'>('cover');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [direction, setDirection] = useState(1);
  const [formData, setFormData] = useState<Record<string, string | boolean>>(() => {
    // Sauvegarde auto (#37) : restaure un brouillon récent (< 24h)
    if (typeof window === 'undefined') return {};
    try {
      const raw = localStorage.getItem(`hl_draft_${id}`);
      if (raw) {
        const d = JSON.parse(raw);
        if (d?.ts && Date.now() - d.ts < 24 * 3600 * 1000 && d.formData) return d.formData;
      }
    } catch { /* ignore */ }
    return {};
  });
  const [identityData, setIdentityData] = useState<IdentityData | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<'card' | 'cash' | undefined>(undefined);
  const [appliedPromo, setAppliedPromo] = useState<PromoCode | null>(null);
  // États de soumission — jamais de succès simulé
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [ticketId, setTicketId] = useState<string | null>(null);

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
      // Sauvegarde auto (#37) : fusionne un brouillon récent (< 24h)
      let draft: Record<string, string | boolean> = {};
      try {
        const raw = localStorage.getItem(`hl_draft_${id}`);
        if (raw) {
          const d = JSON.parse(raw);
          if (d?.ts && Date.now() - d.ts < 24 * 3600 * 1000 && d.formData) draft = d.formData;
        }
      } catch { /* ignore */ }
      setFormData({ ...init, ...draft });
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

  // Sauvegarde auto du brouillon (#37) — réponses conservées 24h en cas de sortie
  useEffect(() => {
    if (typeof window === 'undefined' || screen === 'success') return;
    const hasAnswers = Object.values(formData).some((v) => v !== '' && v !== false);
    if (!hasAnswers) return;
    try { localStorage.setItem(`hl_draft_${id}`, JSON.stringify({ formData, ts: Date.now() })); } catch { /* ignore */ }
  }, [formData, screen, id]);

  const handleStart = useCallback(() => {
    if (!form) return;
    setDirection(1);
    setScreen('form');
  }, [form]);

  // Soumission du formulaire « tout sur une page » (flux non step-by-step)
  const handleScrollSubmit = (data: IdentityData) => {
    setIdentityData(data);
    setDirection(1);
    const due = computePaymentAmount();
    if (isFull || !hasCharge || due === undefined || due <= 0) {
      submitForm(data, undefined);
      return;
    }
    if ((form?.promoCodes?.length ?? 0) > 0) { setScreen('promo'); return; }
    if (allowCashCharge) { setScreen('payment_choice'); } else { setPaymentMethod('card'); setScreen('payment'); }
  };

  useEffect(() => {
    if (screen !== 'cover') return;
    const h = (e: KeyboardEvent) => { if (e.key === 'Enter') handleStart(); };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [screen, handleStart]);

  /** Calcule le montant réel (prix unitaire × nb personnes − promo si applicable) */
  const computePaymentAmount = useCallback((promo?: PromoCode | null): number | undefined => {
    const pf = form?.fields.find((f) => f.type === 'payment');
    const tableField = form?.fields.find((f) => f.type === 'table_reservation');
    let base = 0;
    let hasCharge = false;

    // Paiement classique (prix unitaire × nb de personnes)
    if (pf?.amount) {
      hasCharge = true;
      const peopleField = form?.fields.find((f) => f.type === 'people_count');
      if (peopleField) {
        const count = parseInt(formData[peopleField.id] as string || '1', 10) || 1;
        base += pf.amount * count;
      } else {
        base += pf.amount;
      }
    }

    // Réservation de table (Gala) : prix de la formule × quantité
    if (tableField) {
      const sel = parseTableSelection(formData[tableField.id]);
      const opt = sel.i >= 0 ? tableField.tableOptions?.[sel.i] : undefined;
      if (opt) {
        hasCharge = true;
        base += opt.price * sel.q;
      }
    }

    // Don : montant choisi par le donateur
    const donationField = form?.fields.find((f) => f.type === 'donation');
    if (donationField) {
      const amt = parseFloat(formData[donationField.id] as string || '0') || 0;
      if (amt > 0) {
        hasCharge = true;
        base += amt;
      }
    }

    if (!hasCharge) return undefined;

    const activePromo = promo !== undefined ? promo : appliedPromo;
    if (activePromo) {
      const discount = activePromo.type === 'percent'
        ? Math.round(base * activePromo.discount) / 100
        : activePromo.discount;
      return Math.max(0, base - discount);
    }
    return base;
  }, [form, formData, appliedPromo]);

  // Récapitulatif détaillé pour l'écran avant paiement (#36)
  const buildRecap = useCallback((): { lines: { label: string; value: string }[]; discount?: { label: string; value: string }; total: number } => {
    const pf = form?.fields.find((f) => f.type === 'payment');
    const tableField = form?.fields.find((f) => f.type === 'table_reservation');
    const donationField = form?.fields.find((f) => f.type === 'donation');
    const peopleField = form?.fields.find((f) => f.type === 'people_count');
    const lines: { label: string; value: string }[] = [];
    let base = 0;

    if (pf?.amount) {
      const count = peopleField ? (parseInt(formData[peopleField.id] as string || '1', 10) || 1) : 1;
      const lineTotal = pf.amount * count;
      base += lineTotal;
      lines.push({
        label: count > 1 ? `${pf.label ?? 'Participation'} — ${count} × ${pf.amount} €` : (pf.label ?? 'Participation'),
        value: `${lineTotal.toFixed(2)} €`,
      });
    }
    if (tableField) {
      const sel = parseTableSelection(formData[tableField.id]);
      const opt = sel.i >= 0 ? tableField.tableOptions?.[sel.i] : undefined;
      if (opt) {
        const lineTotal = opt.price * sel.q;
        base += lineTotal;
        lines.push({
          label: `${sel.q} × ${opt.label} (${opt.seats * sel.q} place${opt.seats * sel.q > 1 ? 's' : ''})`,
          value: `${lineTotal.toFixed(2)} €`,
        });
      }
    }
    if (donationField) {
      const amt = parseFloat(formData[donationField.id] as string || '0') || 0;
      if (amt > 0) {
        base += amt;
        lines.push({ label: donationField.label ?? 'Don', value: `${amt.toFixed(2)} €` });
      }
    }

    let discount: { label: string; value: string } | undefined;
    if (appliedPromo) {
      const d = appliedPromo.type === 'percent' ? Math.round(base * appliedPromo.discount) / 100 : appliedPromo.discount;
      discount = { label: `Code promo${appliedPromo.code ? ` « ${appliedPromo.code} »` : ''}`, value: `−${d.toFixed(2)} €` };
    }
    return { lines, discount, total: computePaymentAmount() ?? base };
  }, [form, formData, appliedPromo, computePaymentAmount]);

  /**
   * Construit le payload complet à insérer en base.
   * Captures obligatoires : nom complet, téléphone, adresse,
   * nombre d'invités, montant total calculé, mode de paiement.
   */
  const buildFinalData = useCallback((identity: IdentityData): Record<string, string | boolean> => {
    const peopleField = form?.fields.find((f) => f.type === 'people_count');
    const tableField = form?.fields.find((f) => f.type === 'table_reservation');
    let guestCount = 0;
    if (peopleField) guestCount += parseInt(formData[peopleField.id] as string || '0', 10) || 0;
    let tableSummary = '';
    if (tableField) {
      const sel = parseTableSelection(formData[tableField.id]);
      const opt = sel.i >= 0 ? tableField.tableOptions?.[sel.i] : undefined;
      if (opt) {
        guestCount += opt.seats * sel.q;
        tableSummary = `${sel.q}× ${opt.label} (${opt.seats * sel.q} place${opt.seats * sel.q > 1 ? 's' : ''}) — ${(opt.price * sel.q).toFixed(2)} €`;
      }
    }
    if (guestCount < 1) guestCount = 1;
    // Liste d'attente : si la capacité confirmée est atteinte
    const confirmed = (form?.responses ?? [])
      .filter((r) => (r.data as Record<string, unknown>)?._waitlist !== 'true')
      .reduce((s, r) => s + (parseInt(((r.data as Record<string, string>)?._guestCount) || '1', 10) || 1), 0);
    const full = typeof form?.maxCapacity === 'number' && form.maxCapacity > 0 && confirmed >= form.maxCapacity;
    const donationField = form?.fields.find((f) => f.type === 'donation');
    let donationSummary = '';
    if (donationField) {
      const amt = parseFloat(formData[donationField.id] as string || '0') || 0;
      if (amt > 0) donationSummary = `${amt.toFixed(2)} €`;
    }
    const total = computePaymentAmount();

    return {
      ...(full ? { _waitlist: 'true' } : {}),
      ...(tableSummary ? { _tableReservation: tableSummary } : {}),
      ...(donationSummary ? { _donation: donationSummary } : {}),
      // Identité
      _civility:   identity.civility,
      _firstName:  identity.firstName,
      _lastName:   identity.lastName,
      _fullName:   `${identity.civility} ${identity.firstName} ${identity.lastName}`,
      _email:      identity.email,
      _phone:      identity.phone,
      _address:    identity.address || '',
      // Réservation
      _guestCount: String(guestCount),
      ...(total !== undefined ? { _totalAmount: String(total) } : {}),
      // Réponses aux champs du formulaire
      ...formData,
    };
  }, [form, formData, computePaymentAmount]);

  /**
   * Point d'entrée unique pour soumettre une inscription.
   * Attend la confirmation DB avant d'afficher le succès.
   * Affiche une erreur explicite si l'écriture échoue.
   */
  const submitForm = useCallback(async (
    identity: IdentityData,
    method?: 'card' | 'cash',
  ): Promise<void> => {
    if (submitting) return;
    setSubmitting(true);
    setSubmitError(null);

    const amount = computePaymentAmount();
    const currentUser = getCurrentUser();
    const payload = buildFinalData(identity);

    try {
      const resp = await addResponse(id, payload, currentUser?.id, method, amount);
      // ✓ Ligne physiquement écrite en DB → on peut afficher le succès
      setTicketId(resp.id);
      setPaymentMethod(method);
      setScreen('success');
      // Brouillon consommé → on le supprime (#37)
      try { localStorage.removeItem(`hl_draft_${id}`); } catch { /* ignore */ }

      // Email de confirmation — toujours envoyé à l'email saisi dans l'identité
      const eventDateField = form?.fields.find((f) => f.type === 'event_date');
      fetch('/api/send-confirmation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: identity.email,
          name: `${identity.firstName} ${identity.lastName}`,
          phone: identity.phone,
          address: identity.address,
          formTitle: form?.title ?? '',
          eventDate: eventDateField?.presetValue,
          guestCount: payload._guestCount,
          paymentMethod: method,
          totalAmount: amount,
          ticketId: resp.id,
          isDonation: form?.fields.some((f) => f.type === 'donation') ?? false,
        }),
      }).catch(() => {});
    } catch (err) {
      const msg = err instanceof Error
        ? err.message
        : "Erreur d'enregistrement. Veuillez réessayer.";
      setSubmitError(msg);
    } finally {
      setSubmitting(false);
    }
  }, [submitting, id, form, computePaymentAmount, buildFinalData]);

  const goToPayment = () => {
    setDirection(1);
    const due = computePaymentAmount();
    // Rien à payer (ex : don optionnel laissé vide) → on enregistre directement
    if (due === undefined || due <= 0) {
      submitForm(identityData!, undefined);
      return;
    }
    if (allowCashCharge) {
      setScreen('payment_choice');
    } else {
      setPaymentMethod('card');
      setScreen('payment');
    }
  };

  const goToPromoOrPayment = () => {
    setDirection(1);
    const due = computePaymentAmount();
    if (due !== undefined && due > 0 && (form?.promoCodes?.length ?? 0) > 0) {
      setScreen('promo');
    } else {
      goToPayment();
    }
  };

  const handleIdentityNext = (data: IdentityData) => {
    setIdentityData(data);
    setDirection(1);
    // Événement complet → liste d'attente : on enregistre l'identité sans questions ni paiement
    if (isFull) {
      submitForm(data, undefined);
    } else if (questionFields.length > 0) {
      setCurrentIndex(0);
      setScreen('questions');
    } else if (hasCharge) {
      goToPromoOrPayment();
    } else {
      submitForm(data, undefined);
    }
  };

  if (form?.disabled) return <DisabledScreen title={form.title} />;

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
  const tableField = form.fields.find((f) => f.type === 'table_reservation');
  const donationField = form.fields.find((f) => f.type === 'donation');
  const hasCharge = !!paymentField || !!tableField || !!donationField;
  const allowCashCharge = !!(paymentField?.allowCash || tableField?.allowCash || donationField?.allowCash);
  // Capacité : compte les invités confirmés (hors liste d'attente)
  const confirmedGuests = (form.responses ?? [])
    .filter((r) => (r.data as Record<string, unknown>)?._waitlist !== 'true')
    .reduce((s, r) => s + (parseInt(((r.data as Record<string, string>)?._guestCount) || '1', 10) || 1), 0);
  const isFull = typeof form.maxCapacity === 'number' && form.maxCapacity > 0 && confirmedGuests >= form.maxCapacity;
  const currentField = questionFields[currentIndex];
  const realTotal = questionFields.filter(f => f.type !== 'event_date' && f.type !== 'info_block').length;

  // Nombre de convives (pour le menu par convive) : people_count, sinon places de table, sinon 1
  const guestCount = (() => {
    const peopleField = form?.fields.find((f) => f.type === 'people_count');
    if (peopleField) {
      const n = parseInt(formData[peopleField.id] as string || '0', 10) || 0;
      if (n > 0) return n;
    }
    const tableF = form?.fields.find((f) => f.type === 'table_reservation');
    if (tableF) {
      const sel = parseTableSelection(formData[tableF.id]);
      const opt = sel.i >= 0 ? tableF.tableOptions?.[sel.i] : undefined;
      if (opt) return opt.seats * sel.q;
    }
    return 1;
  })();
  const pct = screen === 'payment_choice' || screen === 'payment' || screen === 'promo' ? 95
    : screen === 'questions' ? Math.round(20 + ((currentIndex + 1) / Math.max(questionFields.length, 1)) * 70)
    : screen === 'identity' ? 15
    : screen === 'form' ? (hasCharge ? 50 : 70)
    : screen === 'success' ? 100
    : 0;

  // Étapes macro (1·2·3) pour le bandeau d'étapes
  const macroSteps = ['Vos infos', ...(realTotal > 0 ? ['Détails'] : []), ...(hasCharge ? ['Paiement'] : [])];
  const activeStep =
    screen === 'identity' ? 0
    : screen === 'questions' ? (realTotal > 0 ? 1 : 0)
    : (screen === 'promo' || screen === 'payment_choice' || screen === 'payment') ? macroSteps.length - 1
    : 0;

  const handleNext = () => {
    if (currentIndex < questionFields.length - 1) {
      setDirection(1); setCurrentIndex((i) => i + 1);
    } else if (hasCharge) {
      goToPromoOrPayment();
    } else {
      submitForm(identityData!, undefined);
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
    submitForm(identityData!, 'cash');
  };

  const handleCard = () => {
    setPaymentMethod('card');
    setDirection(1);
    setScreen('payment');
  };

  return (
    <div className="fixed inset-0 overflow-hidden bg-beige-50" style={form.accentColor ? ({
      '--color-gold-300': form.accentColor,
      '--color-gold-400': form.accentColor,
      '--color-gold-500': form.accentColor,
      '--color-gold-600': form.accentColor,
    } as React.CSSProperties) : undefined}>
      {screen !== 'cover' && screen !== 'success' && (
        <ProgressBar pct={pct} steps={screen === 'form' ? undefined : macroSteps} active={activeStep} />
      )}

      {/* Musique d'ambiance — active dès le chargement du formulaire */}
      {form.youtubeUrl && <YouTubeAmbiance url={form.youtubeUrl} />}

      <div className="fixed bottom-5 right-5 z-40">
        <span className="text-xs text-brown-300/40" style={{ fontFamily: 'var(--font-cormorant)' }}>HabadLyon</span>
      </div>

      {/* ─── Error banner ───────────────────────────────────────── */}
      <AnimatePresence>
        {submitError && (
          <motion.div
            key="submit-error"
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 40 }}
            transition={{ type: 'spring', stiffness: 300, damping: 28 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[100] w-full max-w-sm px-5 py-4 bg-red-50 border border-red-200 rounded-2xl shadow-xl flex items-start gap-3"
          >
            <span className="text-red-500 text-lg flex-shrink-0 mt-0.5">⚠</span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-red-700 mb-0.5">Erreur d&apos;enregistrement</p>
              <p className="text-xs text-red-600 break-words">{submitError}</p>
            </div>
            <button
              onClick={() => setSubmitError(null)}
              className="text-red-400 hover:text-red-600 text-lg leading-none flex-shrink-0 transition-colors"
              aria-label="Fermer"
            >×</button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── Submitting overlay ──────────────────────────────────── */}
      <AnimatePresence>
        {submitting && (
          <motion.div
            key="submitting-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[90] flex items-center justify-center bg-beige-50/70 backdrop-blur-sm"
          >
            <div className="flex flex-col items-center gap-4">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
                className="w-10 h-10 border-2 border-gold-400 border-t-transparent rounded-full"
              />
              <p className="text-sm text-brown-500">Enregistrement en cours…</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence mode="wait">
        {screen === 'cover' && (
          <CoverScreen key="cover" form={form} onStart={handleStart} isFull={isFull}
            participants={(form.responses ?? []).filter((r) => (r.data as Record<string, unknown>)?._waitlist !== 'true').length}
            estMinutes={Math.max(1, Math.ceil((realTotal + 1) * 0.4))}
            seatsLeft={typeof form.maxCapacity === 'number' && form.maxCapacity > 0 ? Math.max(0, form.maxCapacity - confirmedGuests) : null}
          />
        )}

        {screen === 'form' && (
          <ScrollForm
            key="scrollform"
            form={form}
            questionFields={questionFields}
            formData={formData}
            setFormData={setFormData}
            guestCount={guestCount}
            direction={direction}
            onSubmit={handleScrollSubmit}
          />
        )}

          {screen === 'promo' && hasCharge && (
          <AnimatePresence mode="wait" key="promo-host">
            <PromoScreen
              key="promo"
              promoCodes={form.promoCodes ?? []}
              paymentAmount={computePaymentAmount(null) ?? 0}
              direction={direction}
              onApply={(promo) => { setAppliedPromo(promo); goToPayment(); }}
              onSkip={() => { setAppliedPromo(null); goToPayment(); }}
            />
          </AnimatePresence>
        )}

        {screen === 'payment_choice' && hasCharge && (
          <AnimatePresence mode="wait" key="pc-host">
            <PaymentChoiceScreen
              key="payment_choice"
              amount={computePaymentAmount() ?? 0}
              recap={buildRecap()}
              allowCash={allowCashCharge}
              direction={direction}
              firstName={identityData?.firstName ?? ''}
              onCash={handleCash}
              onCard={handleCard}
              onBack={() => {
                setDirection(-1);
                if ((form.promoCodes?.length ?? 0) > 0) {
                  setScreen('promo');
                } else if (questionFields.length > 0) {
                  setCurrentIndex(questionFields.length - 1);
                  setScreen('questions');
                } else {
                  setScreen('identity');
                }
              }}
            />
          </AnimatePresence>
        )}

        {screen === 'payment' && hasCharge && (
          <motion.div key="payment" className="absolute inset-0 overflow-y-auto"
            initial={{ y: '100%' }} animate={{ y: '0%', transition: SPRING }}
            exit={{ y: '-100%', transition: { ...SPRING, stiffness: 340 } }}>
            <div className="min-h-full flex items-start justify-center px-6 py-16">
              <div className="w-full max-w-md">
                <button onClick={() => {
                  setDirection(-1);
                  if (allowCashCharge) {
                    setScreen('payment_choice');
                  } else if ((form.promoCodes?.length ?? 0) > 0) {
                    setScreen('promo');
                  } else if (questionFields.length > 0) {
                    setCurrentIndex(questionFields.length - 1);
                    setScreen('questions');
                  } else {
                    setScreen('identity');
                  }
                }}
                  className="mb-6 text-xs text-brown-400 hover:text-brown-700 transition-colors flex items-center gap-1">← Retour</button>
                <h2 className="text-4xl font-light text-brown-900 mb-2" style={{ fontFamily: 'var(--font-cormorant)' }}>Paiement sécurisé</h2>
                <p className="text-brown-400 text-sm mb-8">{paymentField?.label ?? 'Réservation'} · {(computePaymentAmount() ?? 0).toFixed(2)} €</p>
                <StripePayment
                  amount={computePaymentAmount() ?? paymentField?.amount ?? 50}
                  description={form.title}
                  onSuccess={() => { submitForm(identityData!, 'card'); }}
                />
                <div className="h-10" />
              </div>
            </div>
          </motion.div>
        )}

        {screen === 'success' && <SuccessScreen key="success" paymentMethod={paymentMethod} ticketId={ticketId} isWaitlist={isFull} form={form} />}
      </AnimatePresence>
    </div>
  );
}
