'use client';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense } from 'react';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const from = searchParams.get('from') ?? '/dashboard';

  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [shake, setShake] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const res = await fetch('/api/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    });

    if (res.ok) {
      router.push(from);
    } else {
      const data = await res.json();
      setError(data.error ?? 'Erreur');
      setShake(true);
      setTimeout(() => setShake(false), 500);
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center px-6 bg-beige-50">
      {/* Background blob */}
      <motion.div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full pointer-events-none"
        style={{ background: 'radial-gradient(circle, rgba(201,169,110,0.1) 0%, transparent 70%)' }}
        animate={{ scale: [1, 1.08, 1] }}
        transition={{ repeat: Infinity, duration: 7, ease: 'easeInOut' }}
      />

      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        className="relative w-full max-w-sm"
      >
        {/* Logo */}
        <div className="text-center mb-10">
          <motion.div
            className="inline-flex items-center gap-2 mb-4"
            whileHover={{ scale: 1.02 }}
          >
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-gold-400 to-gold-600 flex items-center justify-center">
              <span className="text-beige-50 text-sm font-bold">H</span>
            </div>
            <span
              className="text-2xl font-medium text-brown-900"
              style={{ fontFamily: 'var(--font-cormorant)' }}
            >
              HabadLyon
            </span>
          </motion.div>
          <p className="text-brown-400 text-sm">Accès administration</p>
        </div>

        {/* Card */}
        <motion.form
          onSubmit={handleSubmit}
          animate={shake ? { x: [-10, 10, -8, 8, -4, 4, 0] } : { x: 0 }}
          transition={{ duration: 0.4 }}
          className="relative bg-beige-50 rounded-3xl border border-beige-200 shadow-[0_30px_80px_rgba(44,24,16,0.08)] overflow-hidden p-8"
        >
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-gold-400 to-gold-300" />

          <div className="mb-6">
            <label className="block text-xs text-brown-500 uppercase tracking-widest font-medium mb-2">
              Mot de passe
            </label>
            <input
              type="password"
              autoFocus
              className="w-full px-4 py-3.5 rounded-xl bg-beige-100 border border-beige-200 text-brown-900 text-base focus:outline-none focus:border-gold-400 transition-colors"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <AnimatePresence>
            {error && (
              <motion.p
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="text-red-500 text-sm mb-4 px-1"
              >
                {error}
              </motion.p>
            )}
          </AnimatePresence>

          <motion.button
            type="submit"
            disabled={loading || !password}
            className="btn-liquid w-full py-4 bg-brown-900 text-beige-50 rounded-xl font-medium text-sm overflow-hidden disabled:opacity-40"
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.98 }}
          >
            <span className="relative z-10">
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <motion.span
                    animate={{ rotate: 360 }}
                    transition={{ repeat: Infinity, duration: 0.8, ease: 'linear' }}
                    className="inline-block w-4 h-4 border-2 border-beige-300 border-t-transparent rounded-full"
                  />
                  Connexion…
                </span>
              ) : (
                'Se connecter →'
              )}
            </span>
          </motion.button>
        </motion.form>
      </motion.div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
