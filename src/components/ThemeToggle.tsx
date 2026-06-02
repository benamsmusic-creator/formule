'use client';
import { motion } from 'framer-motion';
import { usePathname } from 'next/navigation';
import { useTheme } from '@/lib/theme';
import { isAdminPath } from '@/lib/adminRoutes';

export default function ThemeToggle() {
  const [theme, toggle] = useTheme();
  const pathname = usePathname();
  const dark = theme === 'dark';

  // Sur les pages admin, la sidebar a déjà son propre bouton de thème.
  if (isAdminPath(pathname)) return null;

  return (
    <motion.button
      onClick={toggle}
      className="fixed bottom-6 left-6 z-40 w-11 h-11 rounded-full glass border border-gold-400/20 text-lg flex items-center justify-center shadow-lg"
      whileHover={{ scale: 1.08 }}
      whileTap={{ scale: 0.92 }}
      aria-label={dark ? 'Passer en mode clair' : 'Passer en mode sombre'}
      title={dark ? 'Mode clair' : 'Mode sombre'}
    >
      {dark ? '☀️' : '🌙'}
    </motion.button>
  );
}
