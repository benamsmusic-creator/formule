'use client';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { isAdminPath } from '@/lib/adminRoutes';

/** Décale le contenu des pages admin pour laisser place à la sidebar (desktop).
    Ajoute une transition douce à chaque changement de route admin (#12). */
export default function AppFrame({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const admin = isAdminPath(pathname);

  return (
    <main className={admin ? 'lg:pl-60' : ''}>
      {admin ? (
        <AnimatePresence mode="wait">
          <motion.div
            key={pathname}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0, transition: { duration: 0.3, ease: [0.22, 1, 0.36, 1] } }}
            exit={{ opacity: 0, y: -4, transition: { duration: 0.15 } }}
          >
            {children}
          </motion.div>
        </AnimatePresence>
      ) : children}
    </main>
  );
}
