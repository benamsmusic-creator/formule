'use client';
import { motion } from 'framer-motion';
import { useTheme } from '@/lib/theme';

/** Bouton de thème compact, à placer dans une barre de navigation. */
export default function ThemeToggleInline({ className = '' }: { className?: string }) {
  const [theme, toggle] = useTheme();
  const dark = theme === 'dark';

  return (
    <motion.button
      onClick={toggle}
      className={`tap-target inline-flex items-center justify-center w-9 h-9 rounded-full border border-beige-300/70 text-brown-600 hover:text-brown-900 hover:border-gold-400/50 transition-colors text-sm ${className}`}
      whileHover={{ scale: 1.08 }}
      whileTap={{ scale: 0.92 }}
      aria-label={dark ? 'Passer en mode clair' : 'Passer en mode sombre'}
      title={dark ? 'Mode clair' : 'Mode sombre'}
    >
      {dark ? '☀️' : '🌙'}
    </motion.button>
  );
}
