'use client';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

// Pages publiques de contenu où afficher la navigation unifiée.
// (La landing "/" a déjà son propre header ; les pages immersives
//  /forms/[id] et /billet/[id] restent épurées.)
const SHOW_ON = ['/events', '/horaires'];

const LINKS = [
  { href: '/events', label: 'Événements' },
  { href: '/don', label: 'Faire un don' },
  { href: '/horaires', label: 'Horaires' },
];

export default function PublicNav() {
  const pathname = usePathname();
  if (!SHOW_ON.includes(pathname)) return null;

  return (
    <motion.nav
      aria-label="Navigation"
      className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-5 sm:px-10 py-3 sm:py-4"
      initial={{ y: -60, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
    >
      <div className="absolute inset-0 glass border-b border-gold-400/10" />

      {/* Logo → accueil */}
      <Link href="/" className="relative flex items-center gap-2.5" aria-label="Retour à l'accueil">
        <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-gold-400 to-gold-600 flex items-center justify-center shadow-lg">
          <span className="text-beige-50 text-xs font-bold">H</span>
        </div>
        <span className="text-brown-900 font-bold text-base sm:text-lg tracking-tight" style={{ fontFamily: 'var(--font-cormorant)' }}>
          HabadLyon
        </span>
      </Link>

      {/* Liens */}
      <div className="relative flex items-center gap-1 sm:gap-2">
        {LINKS.map((link) => {
          const active = pathname === link.href;
          return (
            <Link key={link.href} href={link.href}>
              <motion.span
                className={`tap-target inline-flex items-center px-2.5 sm:px-3.5 py-2 rounded-xl text-xs sm:text-sm transition-colors ${
                  active
                    ? 'bg-gold-400/15 text-brown-900 font-medium'
                    : 'text-brown-600 hover:text-brown-900 hover:bg-beige-100'
                }`}
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
              >
                {link.label}
              </motion.span>
            </Link>
          );
        })}
      </div>
    </motion.nav>
  );
}
