'use client';
import { useState } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { getCurrentUser, logoutUser } from '@/lib/store';
import { AppUser } from '@/lib/types';

export default function LandingPage() {
  const [user, setUser] = useState<AppUser | null>(() => getCurrentUser());

  const handleLogout = () => {
    logoutUser();
    setUser(null);
  };

  const cards = [
    { icon: '📅', title: 'Événements', desc: 'Inscrivez-vous aux soirées, dîners et célébrations de HabadLyon.' },
    { icon: '🍽️', title: 'Galas & tables', desc: 'Réservez une table complète ou des places individuelles pour nos galas.' },
    { icon: '🤲', title: 'Faire un don', desc: 'Soutenez la communauté avec un don sécurisé, montant libre ou suggéré.' },
  ];

  return (
    <div className="min-h-screen flex flex-col">
      {/* Lien d'évitement clavier */}
      <a href="#contenu" className="skip-link">Aller au contenu</a>

      {/* Top bar */}
      <header className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-5 sm:px-10 py-3 sm:py-4">
        <div className="absolute inset-0 glass border-b border-gold-400/10" />

        {/* Logo */}
        <motion.div
          className="relative flex items-center gap-2.5"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6 }}
        >
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-gold-400 to-gold-600 flex items-center justify-center shadow-lg">
            <span className="text-beige-50 text-sm font-bold">H</span>
          </div>
          <span className="text-brown-900 font-bold text-lg sm:text-xl tracking-tight" style={{ fontFamily: 'var(--font-cormorant)' }}>
            HabadLyon
          </span>
        </motion.div>

        {/* Right nav */}
        <motion.nav
          aria-label="Navigation principale"
          className="relative flex items-center gap-2 sm:gap-3"
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6 }}
        >
          {user ? (
            <>
              <Link href="/compte" aria-label="Voir mes réservations">
                <motion.span
                  className="tap-target inline-flex items-center px-3.5 py-2 rounded-xl bg-gold-400/10 border border-gold-400/30 text-gold-700 text-sm font-medium hover:bg-gold-400/20 transition-colors"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.97 }}
                >
                  Mes réservations
                </motion.span>
              </Link>
              <button
                onClick={handleLogout}
                className="tap-target px-3 py-2 text-sm text-brown-500 hover:text-brown-800 transition-colors"
              >
                Déconnexion
              </button>
            </>
          ) : (
            <Link href="/events" aria-label="Voir les événements">
              <motion.span
                className="btn-liquid tap-target inline-flex items-center px-4 py-2 rounded-xl bg-brown-900 text-beige-50 text-sm font-medium overflow-hidden"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.97 }}
              >
                <span className="relative z-10">Événements</span>
              </motion.span>
            </Link>
          )}

          {/* Admin link — discret mais accessible */}
          <Link
            href="/login"
            className="tap-target inline-flex items-center ml-0.5 text-xs text-brown-400 hover:text-brown-700 transition-colors"
            aria-label="Accès administration"
          >
            Admin
          </Link>
        </motion.nav>
      </header>

      {/* Hero */}
      <main id="contenu" className="flex-1 flex flex-col items-center justify-center px-5 sm:px-6 pt-28 sm:pt-24 pb-16 text-center relative">
        {/* Glow background */}
        <motion.div
          aria-hidden="true"
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[min(700px,90vw)] h-[min(700px,90vw)] rounded-full pointer-events-none"
          style={{ background: 'radial-gradient(circle, rgba(201,169,110,0.10) 0%, transparent 65%)' }}
          animate={{ scale: [1, 1.06, 1] }}
          transition={{ repeat: Infinity, duration: 8, ease: 'easeInOut' }}
        />

        <motion.div
          className="relative z-10 max-w-2xl"
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
        >
          {/* Badge */}
          <motion.div
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-gold-400/10 border border-gold-400/20 text-gold-700 text-xs font-medium mb-6"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            ✦ La communauté HabadLyon en ligne
          </motion.div>

          <h1
            className="text-[clamp(2.5rem,8vw,6rem)] font-light text-brown-900 leading-[1.05] mb-5"
            style={{ fontFamily: 'var(--font-cormorant)' }}
          >
            Bienvenue chez{' '}
            <em className="gradient-text not-italic">HabadLyon</em>
          </h1>

          <p className="text-brown-600 text-base sm:text-xl leading-relaxed mb-10 max-w-lg mx-auto">
            Inscrivez-vous à nos événements, réservez votre table de gala, faites un don
            et gérez vos participations — en toute simplicité.
          </p>

          {user ? (
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4">
              <Link href="/compte" className="w-full sm:w-auto">
                <motion.span
                  className="btn-liquid tap-target inline-flex items-center justify-center w-full sm:w-auto px-8 sm:px-10 py-4 bg-brown-900 text-beige-50 rounded-2xl font-medium text-base overflow-hidden"
                  whileHover={{ scale: 1.03, y: -2 }}
                  whileTap={{ scale: 0.97 }}
                >
                  <span className="relative z-10">Mes réservations →</span>
                </motion.span>
              </Link>
              <p className="text-brown-500 text-sm">
                Bonjour, <span className="font-medium text-brown-800">{user.firstName}</span> 👋
              </p>
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-3 sm:gap-4">
              <Link href="/events" className="w-full sm:w-auto">
                <motion.span
                  className="btn-liquid tap-target inline-flex items-center justify-center w-full sm:w-auto px-8 sm:px-10 py-4 bg-brown-900 text-beige-50 rounded-2xl font-medium text-base overflow-hidden"
                  whileHover={{ scale: 1.03, y: -2 }}
                  whileTap={{ scale: 0.97 }}
                >
                  <span className="relative z-10">Voir les événements →</span>
                </motion.span>
              </Link>
              <Link href="/events" className="w-full sm:w-auto">
                <motion.span
                  className="tap-target inline-flex items-center justify-center w-full sm:w-auto px-8 sm:px-10 py-4 rounded-2xl font-medium text-base border-2 border-gold-400/40 text-brown-800 hover:bg-gold-400/10 transition-colors"
                  whileHover={{ scale: 1.03, y: -2 }}
                  whileTap={{ scale: 0.97 }}
                >
                  🤲 Faire un don
                </motion.span>
              </Link>
            </div>
          )}
        </motion.div>

        {/* Cards */}
        <motion.div
          className="relative z-10 grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-3xl w-full mt-16 sm:mt-20"
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.4 }}
        >
          {cards.map((card, i) => (
            <motion.div
              key={card.title}
              className="p-6 rounded-2xl bg-beige-50 border border-beige-200 text-center"
              whileHover={{ y: -4, boxShadow: '0 20px 50px rgba(44,24,16,0.07)' }}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 + i * 0.08 }}
            >
              <div className="text-3xl mb-3" aria-hidden="true">{card.icon}</div>
              <h2 className="font-medium text-brown-900 mb-2" style={{ fontFamily: 'var(--font-cormorant)', fontSize: '1.15rem' }}>
                {card.title}
              </h2>
              <p className="text-sm text-brown-600 leading-relaxed">{card.desc}</p>
            </motion.div>
          ))}
        </motion.div>
      </main>

      {/* Footer */}
      <footer className="py-6 text-center safe-bottom">
        <p className="text-xs text-brown-400" style={{ fontFamily: 'var(--font-cormorant)' }}>
          © {new Date().getFullYear()} HabadLyon · Tous droits réservés
        </p>
      </footer>
    </div>
  );
}
