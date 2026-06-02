'use client';
import { useState } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { getCurrentUser, logoutUser } from '@/lib/store';
import { AppUser } from '@/lib/types';
import { useLang, DICT } from '@/lib/i18n';

export default function LandingPage() {
  const [user, setUser] = useState<AppUser | null>(() => getCurrentUser());
  const [lang, setLang] = useLang();
  const t = DICT[lang];

  const handleLogout = () => { logoutUser(); setUser(null); };

  const cards = [
    { icon: '📅', title: t.card_events_t, desc: t.card_events_d, href: '/events' },
    { icon: '🍽️', title: t.card_gala_t, desc: t.card_gala_d, href: '/events' },
    { icon: '🤲', title: t.card_don_t, desc: t.card_don_d, href: '/don' },
    { icon: '🕯️', title: t.card_horaires_t, desc: t.card_horaires_d, href: '/horaires' },
  ];

  return (
    <div className="min-h-screen flex flex-col">
      <a href="#contenu" className="skip-link">Aller au contenu</a>

      <header className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-5 sm:px-10 py-3 sm:py-4">
        <div className="absolute inset-0 glass border-b border-gold-400/10" />
        <motion.div className="relative flex items-center gap-2.5" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.6 }}>
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-gold-400 to-gold-600 flex items-center justify-center shadow-lg">
            <span className="text-beige-50 text-sm font-bold">H</span>
          </div>
          <span className="text-brown-900 font-bold text-lg sm:text-xl tracking-tight" style={{ fontFamily: 'var(--font-cormorant)' }}>HabadLyon</span>
        </motion.div>

        <motion.nav aria-label="Navigation" className="relative flex items-center gap-2 sm:gap-3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.6 }}>
          {/* Sélecteur de langue */}
          <button
            onClick={() => setLang(lang === 'fr' ? 'en' : 'fr')}
            className="tap-target inline-flex items-center px-2.5 py-2 text-xs font-semibold text-brown-500 hover:text-brown-900 transition-colors"
            aria-label="Changer de langue"
          >
            {lang === 'fr' ? 'EN' : 'FR'}
          </button>
          <Link href="/events" className="tap-target hidden sm:inline-flex items-center px-3 py-2 text-sm text-brown-600 hover:text-brown-900 transition-colors">{t.nav_events}</Link>
          {user ? (
            <>
              <Link href="/compte" aria-label={t.nav_account}>
                <span className="tap-target inline-flex items-center px-3.5 py-2 rounded-xl bg-gold-400/10 border border-gold-400/30 text-gold-700 text-sm font-medium hover:bg-gold-400/20 transition-colors">{t.nav_account}</span>
              </Link>
              <button onClick={handleLogout} className="tap-target px-2.5 py-2 text-sm text-brown-500 hover:text-brown-800 transition-colors">{t.nav_logout}</button>
            </>
          ) : (
            <Link href="/user-login" aria-label={t.nav_login}>
              <span className="tap-target inline-flex items-center px-4 py-2 rounded-xl bg-brown-900 text-beige-50 text-sm font-medium">{t.nav_login}</span>
            </Link>
          )}
          <Link href="/login" className="tap-target inline-flex items-center ml-0.5 text-xs text-brown-400 hover:text-brown-700 transition-colors" aria-label={t.nav_admin}>{t.nav_admin}</Link>
        </motion.nav>
      </header>

      <main id="contenu" className="flex-1 flex flex-col items-center justify-center px-5 sm:px-6 pt-28 sm:pt-24 pb-16 text-center relative">
        <motion.div aria-hidden="true" className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[min(700px,90vw)] h-[min(700px,90vw)] rounded-full pointer-events-none"
          style={{ background: 'radial-gradient(circle, rgba(201,169,110,0.12) 0%, transparent 65%)' }}
          animate={{ scale: [1, 1.06, 1] }} transition={{ repeat: Infinity, duration: 8, ease: 'easeInOut' }} />

        <motion.div className="relative z-10 max-w-2xl" initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}>
          <motion.div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-gold-400/10 border border-gold-400/20 text-gold-700 text-xs font-medium mb-6"
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
            {t.hero_badge}
          </motion.div>

          <h1 className="text-[clamp(2.5rem,8vw,6rem)] font-light text-brown-900 leading-[1.05] mb-5" style={{ fontFamily: 'var(--font-cormorant)' }}>
            {t.hero_welcome} <em className="gradient-text not-italic">HabadLyon</em>
          </h1>
          <p className="text-brown-600 text-base sm:text-xl leading-relaxed mb-9 max-w-lg mx-auto">{t.hero_sub}</p>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-3 sm:gap-4">
            <Link href="/events" className="w-full sm:w-auto">
              <motion.span className="btn-liquid tap-target inline-flex items-center justify-center w-full sm:w-auto px-8 sm:px-10 py-4 bg-brown-900 text-beige-50 rounded-2xl font-medium text-base overflow-hidden"
                whileHover={{ scale: 1.03, y: -2 }} whileTap={{ scale: 0.97 }}>
                <span className="relative z-10">{t.cta_events}</span>
              </motion.span>
            </Link>
            <Link href="/don" className="w-full sm:w-auto">
              <motion.span className="tap-target inline-flex items-center justify-center w-full sm:w-auto px-8 sm:px-10 py-4 rounded-2xl font-medium text-base border-2 border-gold-400/40 text-brown-800 hover:bg-gold-400/10 transition-colors"
                whileHover={{ scale: 1.03, y: -2 }} whileTap={{ scale: 0.97 }}>
                {t.cta_donate}
              </motion.span>
            </Link>
          </div>
        </motion.div>

        <motion.div className="relative z-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 max-w-4xl w-full mt-16 sm:mt-20"
          initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 0.4 }}>
          {cards.map((card, i) => (
            <motion.div key={card.title} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 + i * 0.08 }}>
              <Link href={card.href} className="block h-full">
                <motion.div className="h-full p-6 rounded-2xl bg-beige-50 border border-beige-200 text-center cursor-pointer" whileHover={{ y: -4, boxShadow: '0 20px 50px rgba(44,24,16,0.07)' }}>
                  <div className="text-3xl mb-3" aria-hidden="true">{card.icon}</div>
                  <h2 className="font-medium text-brown-900 mb-2" style={{ fontFamily: 'var(--font-cormorant)', fontSize: '1.1rem' }}>{card.title}</h2>
                  <p className="text-sm text-brown-600 leading-relaxed">{card.desc}</p>
                </motion.div>
              </Link>
            </motion.div>
          ))}
        </motion.div>

        {!user && (
          <motion.div className="relative z-10 mt-16 w-full max-w-3xl rounded-3xl bg-brown-900 text-beige-50 p-8 sm:p-10 text-center overflow-hidden"
            initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.7 }}>
            <h2 className="text-2xl sm:text-3xl font-light mb-2" style={{ fontFamily: 'var(--font-cormorant)' }}>{t.member_title}</h2>
            <p className="text-beige-300 text-sm mb-6 max-w-md mx-auto">{t.member_sub}</p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link href="/register" className="w-full sm:w-auto">
                <span className="tap-target inline-flex items-center justify-center w-full sm:w-auto px-8 py-3.5 rounded-xl bg-gold-400 text-brown-900 font-semibold text-sm hover:bg-gold-300 transition-colors">{t.member_create}</span>
              </Link>
              <Link href="/user-login" className="w-full sm:w-auto">
                <span className="tap-target inline-flex items-center justify-center w-full sm:w-auto px-8 py-3.5 rounded-xl border border-beige-50/30 text-beige-50 font-medium text-sm hover:bg-beige-50/10 transition-colors">{t.member_have}</span>
              </Link>
            </div>
            <p className="text-beige-400/60 text-xs mt-4">{t.member_note}</p>
          </motion.div>
        )}
      </main>

      <section className="px-5 sm:px-6 py-12 border-t border-beige-200">
        <div className="max-w-3xl mx-auto text-center">
          <p className="text-xs uppercase tracking-widest text-gold-600 mb-2">{t.saas_kicker}</p>
          <h2 className="text-2xl sm:text-3xl font-light text-brown-900 mb-3" style={{ fontFamily: 'var(--font-cormorant)' }}>{t.saas_title}</h2>
          <p className="text-brown-500 text-sm mb-6 max-w-lg mx-auto">{t.saas_sub}</p>
          <Link href="/signup">
            <motion.span className="btn-liquid inline-flex items-center px-8 py-3.5 rounded-xl bg-brown-900 text-beige-50 font-medium text-sm overflow-hidden"
              whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
              <span className="relative z-10">{t.saas_cta}</span>
            </motion.span>
          </Link>
        </div>
      </section>

      <footer className="py-6 text-center safe-bottom border-t border-beige-200">
        <p className="text-xs text-brown-400" style={{ fontFamily: 'var(--font-cormorant)' }}>© {new Date().getFullYear()} HabadLyon · Tous droits réservés</p>
        <Link href="/infos" className="text-xs text-brown-300 hover:text-brown-600 transition-colors mt-1 inline-block">{t.footer_legal}</Link>
      </footer>
    </div>
  );
}
