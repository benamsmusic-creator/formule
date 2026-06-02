'use client';
import { useState } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { getCurrentUser } from '@/lib/store';
import { AppUser } from '@/lib/types';
import { useLang, DICT } from '@/lib/i18n';

const fadeUp = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
};

export default function LandingPage() {
  const [user] = useState<AppUser | null>(() => getCurrentUser());
  const [lang, setLang] = useLang();
  const t = DICT[lang];

  const features = [
    { k: '01', title: t.card_events_t, desc: t.card_events_d, href: '/events' },
    { k: '02', title: t.card_gala_t, desc: t.card_gala_d, href: '/events' },
    { k: '03', title: t.card_don_t, desc: t.card_don_d, href: '/don' },
    { k: '04', title: t.card_horaires_t, desc: t.card_horaires_d, href: '/horaires' },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-beige-50">
      <a href="#contenu" className="skip-link">Aller au contenu</a>

      {/* Header — minimal */}
      <header className="fixed top-0 left-0 right-0 z-50">
        <div className="absolute inset-0 bg-beige-50/80 backdrop-blur-md border-b border-beige-200/60" />
        <div className="relative max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
          <span className="text-brown-900 font-semibold tracking-tight text-lg" style={{ fontFamily: 'var(--font-cormorant)' }}>HabadLyon</span>
          <nav aria-label="Navigation" className="flex items-center gap-5 text-sm">
            <Link href="/events" className="hidden sm:inline text-brown-500 hover:text-brown-900 transition-colors">{t.nav_events}</Link>
            <Link href="/horaires" className="hidden sm:inline text-brown-500 hover:text-brown-900 transition-colors">{t.card_horaires_t}</Link>
            <button onClick={() => setLang(lang === 'fr' ? 'en' : 'fr')} className="text-brown-400 hover:text-brown-900 transition-colors text-xs font-semibold">{lang === 'fr' ? 'EN' : 'FR'}</button>
            {user ? (
              <Link href="/compte" className="text-brown-900 font-medium hover:opacity-70 transition-opacity">{t.nav_account}</Link>
            ) : (
              <Link href="/user-login" className="text-brown-900 font-medium hover:opacity-70 transition-opacity">{t.nav_login}</Link>
            )}
          </nav>
        </div>
      </header>

      {/* Hero — beaucoup d'air */}
      <main id="contenu" className="flex-1">
        <section className="max-w-3xl mx-auto px-6 pt-40 pb-28 sm:pt-48 sm:pb-36 text-center">
          <motion.p {...fadeUp} transition={{ duration: 0.5 }} className="text-xs uppercase tracking-[0.2em] text-brown-400 mb-8">
            {t.hero_badge.replace('✦ ', '')}
          </motion.p>
          <motion.h1 {...fadeUp} transition={{ duration: 0.6, delay: 0.05 }}
            className="text-[clamp(2.75rem,7vw,5.5rem)] leading-[1.04] tracking-tight text-brown-900 font-light mb-7"
            style={{ fontFamily: 'var(--font-cormorant)' }}>
            {t.hero_welcome}<br /><span className="text-gold-600">HabadLyon</span>
          </motion.h1>
          <motion.p {...fadeUp} transition={{ duration: 0.6, delay: 0.1 }}
            className="text-brown-500 text-lg leading-relaxed max-w-md mx-auto mb-10">
            {t.hero_sub}
          </motion.p>
          <motion.div {...fadeUp} transition={{ duration: 0.6, delay: 0.15 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link href="/events" className="w-full sm:w-auto">
              <span className="inline-flex items-center justify-center w-full sm:w-auto px-7 py-3.5 bg-brown-900 text-beige-50 rounded-full text-sm font-medium hover:bg-brown-800 transition-colors">
                {t.cta_events}
              </span>
            </Link>
            <Link href="/don" className="w-full sm:w-auto">
              <span className="inline-flex items-center justify-center w-full sm:w-auto px-7 py-3.5 text-brown-700 rounded-full text-sm font-medium hover:bg-beige-100 transition-colors">
                {t.cta_donate}
              </span>
            </Link>
          </motion.div>
        </section>

        {/* Fonctions — liste épurée à filets fins */}
        <section className="max-w-5xl mx-auto px-6 pb-28">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 border-t border-beige-200">
            {features.map((f, i) => (
              <motion.div key={f.title}
                initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.05 }}>
                <Link href={f.href} className="group block h-full px-5 py-8 border-b sm:border-r border-beige-200 hover:bg-beige-100/50 transition-colors">
                  <span className="text-xs font-mono text-gold-500">{f.k}</span>
                  <h2 className="mt-3 text-lg font-medium text-brown-900" style={{ fontFamily: 'var(--font-cormorant)' }}>{f.title}</h2>
                  <p className="mt-1.5 text-sm text-brown-500 leading-relaxed">{f.desc}</p>
                  <span className="mt-3 inline-block text-sm text-brown-400 group-hover:text-gold-600 transition-colors">→</span>
                </Link>
              </motion.div>
            ))}
          </div>
        </section>

        {/* Membre — ligne discrète */}
        {!user && (
          <section className="max-w-3xl mx-auto px-6 pb-28 text-center">
            <p className="text-brown-500 text-sm">
              {t.member_sub}{' '}
              <Link href="/register" className="text-brown-900 font-medium underline underline-offset-4 decoration-gold-400 hover:decoration-brown-900 transition-colors">{t.member_create}</Link>
              {' · '}
              <Link href="/user-login" className="text-brown-600 hover:text-brown-900 transition-colors">{t.member_have}</Link>
            </p>
          </section>
        )}

        {/* Communautés (SaaS) — bloc minimal */}
        <section className="border-t border-beige-200">
          <div className="max-w-3xl mx-auto px-6 py-24 text-center">
            <p className="text-xs uppercase tracking-[0.2em] text-brown-400 mb-4">{t.saas_kicker}</p>
            <h2 className="text-[clamp(1.75rem,4vw,2.75rem)] font-light text-brown-900 leading-tight mb-5" style={{ fontFamily: 'var(--font-cormorant)' }}>
              {t.saas_title}
            </h2>
            <p className="text-brown-500 text-base max-w-lg mx-auto mb-9">{t.saas_sub}</p>
            <Link href="/signup">
              <span className="inline-flex items-center px-7 py-3.5 bg-brown-900 text-beige-50 rounded-full text-sm font-medium hover:bg-brown-800 transition-colors">
                {t.saas_cta}
              </span>
            </Link>
          </div>
        </section>
      </main>

      {/* Footer — minimal */}
      <footer className="border-t border-beige-200">
        <div className="max-w-5xl mx-auto px-6 py-8 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-brown-400">
          <span>© {new Date().getFullYear()} HabadLyon</span>
          <div className="flex items-center gap-5">
            <Link href="/infos" className="hover:text-brown-700 transition-colors">{t.footer_legal}</Link>
            <Link href="/login" className="hover:text-brown-700 transition-colors">{t.nav_admin}</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
