'use client';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { usePathname } from 'next/navigation';

// Bouton "retour en haut" — visible après défilement, sur les pages à contenu long.
const HIDE_ON = ['/forms', '/billet', '/builder'];

export default function ScrollToTop() {
  const [visible, setVisible] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > 400);
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  if (HIDE_ON.some((p) => pathname.startsWith(p))) return null;

  return (
    <AnimatePresence>
      {visible && (
        <motion.button
          initial={{ opacity: 0, scale: 0.8, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.8, y: 10 }}
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          className="fixed bottom-6 right-6 z-40 w-11 h-11 rounded-full bg-brown-900 text-beige-50 shadow-lg flex items-center justify-center hover:bg-brown-800 transition-colors"
          aria-label="Remonter en haut"
        >
          ↑
        </motion.button>
      )}
    </AnimatePresence>
  );
}
