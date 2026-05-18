'use client';
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { getCurrentUser, logoutUser } from '@/lib/store';
import { AppUser } from '@/lib/types';

export default function LandingPage() {
  const [user, setUser] = useState<AppUser | null>(null);

  useEffect(() => {
    setUser(getCurrentUser());
  }, []);

  const handleLogout = () => {
    logoutUser();
    setUser(null);
  };

  return (
    <div className="min-h-screen flex flex-col">
      {/* Top bar */}
      <header className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 sm:px-10 py-4">
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
          <span className="text-brown-900 font-bold text-xl tracking-tight" style={{ fontFamily: 'var(--font-cormorant)' }}>
            HabadLyon
          </span>
        </motion.div>

        {/* Right nav */}
        <motion.div
          className="relative flex items-center gap-3"
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6 }}
        >
          {user ? (
            <>
              <Link href="/compte">
                <motion.button
                  className="px-4 py-2 rounded-xl bg-gold-400/10 border border-gold-400/30 text-gold-700 text-sm font-medium hover:bg-gold-400/20 transition-colors"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.97 }}
                >
                  Mes réservations
                </motion.button>
              </Link>
              <button
                onClick={handleLogout}
                className="text-sm text-brown-400 hover:text-brown-700 transition-colors"
              >
                Déconnexion
              </button>
            </>
          ) : (
            <>
              <Link href="/user-login">
                <motion.button
                  className="px-4 py-2 rounded-xl text-brown-700 text-sm font-medium hover:bg-beige-200 transition-colors"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.97 }}
                >
                  Se connecter
                </motion.button>
              </Link>
              <Link href="/register">
                <motion.button
                  className="btn-liquid px-5 py-2 rounded-xl bg-brown-900 text-beige-50 text-sm font-medium overflow-hidden"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.97 }}
                >
                  <span className="relative z-10">Créer un compte</span>
                </motion.button>
              </Link>
            </>
          )}

          {/* Admin link — discreet */}
          <Link href="/login">
            <motion.span
              className="ml-1 text-xs text-brown-300/50 hover:text-brown-500 transition-colors"
              whileHover={{ scale: 1.05 }}
            >
              Admin
            </motion.span>
          </Link>
        </motion.div>
      </header>

      {/* Hero */}
      <main className="flex-1 flex flex-col items-center justify-center px-6 pt-24 pb-20 text-center relative">
        {/* Glow background */}
        <motion.div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] rounded-full pointer-events-none"
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
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-gold-400/10 border border-gold-400/20 text-gold-600 text-sm font-medium mb-8"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            ✦ Réservations & événements
          </motion.div>

          <h1
            className="text-[clamp(3rem,8vw,6rem)] font-light text-brown-900 leading-tight mb-6"
            style={{ fontFamily: 'var(--font-cormorant)' }}
          >
            Bienvenue chez{' '}
            <em className="gradient-text not-italic">HabadLyon</em>
          </h1>

          <p className="text-brown-500 text-lg sm:text-xl leading-relaxed mb-12 max-w-lg mx-auto">
            Inscrivez-vous à nos événements, consultez vos réservations et gérez votre participation en toute simplicité.
          </p>

          {user ? (
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link href="/compte">
                <motion.button
                  className="btn-liquid px-10 py-4 bg-brown-900 text-beige-50 rounded-2xl font-medium text-base overflow-hidden"
                  whileHover={{ scale: 1.04, y: -2 }}
                  whileTap={{ scale: 0.97 }}
                >
                  <span className="relative z-10">Mes réservations →</span>
                </motion.button>
              </Link>
              <p className="text-brown-400 text-sm">
                Bonjour, <span className="font-medium text-brown-700">{user.firstName}</span> 👋
              </p>
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link href="/register">
                <motion.button
                  className="btn-liquid px-10 py-4 bg-brown-900 text-beige-50 rounded-2xl font-medium text-base overflow-hidden"
                  whileHover={{ scale: 1.04, y: -2 }}
                  whileTap={{ scale: 0.97 }}
                >
                  <span className="relative z-10">Créer mon compte →</span>
                </motion.button>
              </Link>
              <Link href="/user-login">
                <motion.button
                  className="px-8 py-4 rounded-2xl border-2 border-beige-300 text-brown-700 font-medium text-base hover:border-gold-400/50 transition-colors"
                  whileHover={{ scale: 1.02, y: -1 }}
                  whileTap={{ scale: 0.98 }}
                >
                  J&apos;ai déjà un compte
                </motion.button>
              </Link>
            </div>
          )}
        </motion.div>

        {/* Cards */}
        <motion.div
          className="relative z-10 grid sm:grid-cols-3 gap-4 max-w-3xl w-full mt-20"
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.4 }}
        >
          {[
            { icon: '📅', title: 'Événements', desc: 'Inscrivez-vous aux soirées, dîners et célébrations de HabadLyon.' },
            { icon: '✦', title: 'Réservations', desc: 'Retrouvez toutes vos inscriptions passées et à venir.' },
            { icon: '◆', title: 'Paiement sécurisé', desc: 'Réglez en ligne par carte ou en espèces sur place.' },
          ].map((card, i) => (
            <motion.div
              key={card.title}
              className="p-6 rounded-2xl bg-beige-50 border border-beige-200 text-center"
              whileHover={{ y: -4, boxShadow: '0 20px 50px rgba(44,24,16,0.07)' }}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 + i * 0.08 }}
            >
              <div className="text-3xl mb-3">{card.icon}</div>
              <h3 className="font-medium text-brown-900 mb-2" style={{ fontFamily: 'var(--font-cormorant)', fontSize: '1.1rem' }}>
                {card.title}
              </h3>
              <p className="text-xs text-brown-500 leading-relaxed">{card.desc}</p>
            </motion.div>
          ))}
        </motion.div>
      </main>

      {/* Footer */}
      <footer className="py-6 text-center">
        <p className="text-xs text-brown-300/50" style={{ fontFamily: 'var(--font-cormorant)' }}>
          © {new Date().getFullYear()} HabadLyon · Tous droits réservés
        </p>
      </footer>
    </div>
  );
}
