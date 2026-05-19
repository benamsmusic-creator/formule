'use client';
import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export type ToastType = 'success' | 'error' | 'info';

export interface ToastMsg {
  id: string;
  message: string;
  type: ToastType;
}

/** Hook à utiliser dans le composant parent qui possède le <Toaster> */
export function useToast() {
  const [toasts, setToasts] = useState<ToastMsg[]>([]);

  const toast = useCallback((message: string, type: ToastType = 'info') => {
    const id = crypto.randomUUID();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(
      () => setToasts((prev) => prev.filter((t) => t.id !== id)),
      3500
    );
  }, []);

  return { toasts, toast };
}

const ICONS: Record<ToastType, string> = {
  success: '✓',
  error: '✕',
  info: 'ℹ',
};

const STYLES: Record<ToastType, string> = {
  success: 'bg-green-500 text-white shadow-green-500/25',
  error:   'bg-red-500 text-white shadow-red-500/25',
  info:    'bg-[#2C1810] text-[#FAF7F2] shadow-[#2C1810]/20',
};

/** Composant à placer une fois, au niveau du layout ou de la page */
export function Toaster({ toasts }: { toasts: ToastMsg[] }) {
  return (
    /* fixed, centré horizontalement, z élevé, pas d'interaction sur le conteneur */
    <div
      aria-live="polite"
      className="fixed top-4 inset-x-0 z-[300] flex flex-col items-center gap-2 px-4 pointer-events-none"
    >
      <AnimatePresence mode="popLayout">
        {toasts.map((t) => (
          <motion.div
            key={t.id}
            layout
            initial={{ y: -24, opacity: 0, scale: 0.93 }}
            animate={{ y: 0,   opacity: 1, scale: 1 }}
            exit={  { y: -16, opacity: 0, scale: 0.93 }}
            transition={{ type: 'spring', stiffness: 440, damping: 32 }}
            className={`
              flex items-center gap-2.5 px-5 py-3 rounded-2xl
              shadow-xl text-sm font-medium
              w-full max-w-sm
              ${STYLES[t.type]}
            `}
          >
            <span className="text-base flex-shrink-0">{ICONS[t.type]}</span>
            <span className="leading-snug">{t.message}</span>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
