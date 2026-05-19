'use client';
import { useState, useEffect, Suspense } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import { getForms, deleteForm } from '@/lib/store';
import { Form } from '@/lib/types';
import { formatDate } from '@/lib/utils';

function StatCard({ label, value, icon, delay }: { label: string; value: number; icon: string; delay: number }) {
  const [displayed, setDisplayed] = useState(0);

  useEffect(() => {
    const duration = 1000;
    const steps = 40;
    const increment = value / steps;
    let current = 0;
    const timer = setInterval(() => {
      current += increment;
      if (current >= value) {
        setDisplayed(value);
        clearInterval(timer);
      } else {
        setDisplayed(Math.floor(current));
      }
    }, duration / steps);
    return () => clearInterval(timer);
  }, [value]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      className="p-6 rounded-2xl bg-beige-50 border border-beige-200"
      whileHover={{ y: -3, boxShadow: '0 12px 40px rgba(44,24,16,0.07)' }}
    >
      <div className="flex items-center justify-between mb-4">
        <span className="text-2xl text-gold-500">{icon}</span>
        <div className="w-1.5 h-1.5 rounded-full bg-gold-400 animate-pulse" />
      </div>
      <p
        className="text-4xl font-light text-brown-900 mb-1"
        style={{ fontFamily: 'var(--font-cormorant)' }}
      >
        {displayed}
      </p>
      <p className="text-xs text-brown-500 uppercase tracking-widest">{label}</p>
    </motion.div>
  );
}

function FormCard({ form, onDelete, index, onCopied }: { form: Form; onDelete: () => void; index: number; onCopied: () => void }) {
  const [showConfirm, setShowConfirm] = useState(false);
  const paymentFields = form.fields.filter((f) => f.type === 'payment');
  const totalRevenue = form.responses
    .filter((r) => r.paymentStatus === 'paid')
    .reduce((sum, r) => sum + (r.paymentAmount ?? 0), 0);

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -40, scale: 0.95 }}
      transition={{ delay: index * 0.07, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className="group relative bg-beige-50 rounded-2xl border border-beige-200 overflow-hidden hover:border-gold-400/40 transition-all duration-300"
      whileHover={{ y: -4, boxShadow: '0 20px 60px rgba(44,24,16,0.08)' }}
      layout
    >
      <div className="h-0.5 bg-gradient-to-r from-gold-400/60 to-transparent" />
      <div className="p-6">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div className="flex-1 min-w-0">
            <h3
              className="text-xl font-medium text-brown-900 truncate mb-0.5"
              style={{ fontFamily: 'var(--font-cormorant)' }}
            >
              {form.title}
            </h3>
            {form.description && (
              <p className="text-xs text-brown-400 truncate">{form.description}</p>
            )}
          </div>
          <div className="flex items-center gap-1 flex-shrink-0">
            {paymentFields.length > 0 && (
              <span className="text-xs px-2 py-1 rounded-full bg-gold-400/10 text-gold-600 border border-gold-400/20">
                ◆ Stripe
              </span>
            )}
          </div>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-3 mb-5">
          {[
            { label: 'Champs', value: form.fields.length, icon: '◈' },
            { label: 'Réponses', value: form.responses?.length ?? 0, icon: '✦' },
            { label: 'Revenus', value: totalRevenue > 0 ? `${totalRevenue}€` : '—', icon: '◆' },
          ].map((stat) => (
            <div key={stat.label} className="p-3 rounded-xl bg-beige-100 text-center">
              <p className="text-xs text-gold-500 mb-1">{stat.icon}</p>
              <p className="text-base font-medium text-brown-900">{stat.value}</p>
              <p className="text-[10px] text-brown-400 uppercase tracking-wide">{stat.label}</p>
            </div>
          ))}
        </div>

        <p className="text-xs text-brown-300 mb-4">
          Créé le {formatDate(form.createdAt)}
        </p>

        {/* Actions — row 1: primary */}
        <div className="grid grid-cols-2 gap-2 mb-2">
          <Link href={`/forms/${form.id}`}>
            <motion.button
              className="w-full py-3 rounded-xl border-2 border-beige-200 text-brown-700 text-xs font-semibold hover:border-gold-400/50 hover:bg-beige-100 transition-colors"
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.98 }}
            >
              Voir le formulaire →
            </motion.button>
          </Link>
          <Link href={`/dashboard/responses/${form.id}`}>
            <motion.button
              className="w-full py-3 rounded-xl bg-brown-900 text-beige-50 text-xs font-semibold"
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.98 }}
            >
              Réponses {form.responses?.length > 0 ? `(${form.responses.length})` : ''}
            </motion.button>
          </Link>
        </div>

        {/* Actions — row 2: secondary */}
        <div className="flex items-center gap-2">
          <Link href={`/builder?id=${form.id}`} className="flex-1">
            <motion.button
              className="w-full py-2.5 rounded-xl bg-beige-100 border border-beige-200 text-brown-600 text-xs font-medium hover:border-gold-400/40 transition-colors"
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.98 }}
            >
              Éditer
            </motion.button>
          </Link>

          <motion.button
            className="w-10 h-9 rounded-xl bg-beige-100 border border-beige-200 text-brown-500 text-sm flex items-center justify-center hover:bg-beige-200 transition-colors flex-shrink-0"
            whileTap={{ scale: 0.95 }}
            onClick={() => {
              navigator.clipboard.writeText(`${window.location.origin}/forms/${form.id}`);
              onCopied();
            }}
            title="Copier le lien"
          >
            🔗
          </motion.button>

          <motion.button
            className="w-10 h-9 rounded-xl bg-beige-100 border border-beige-200 text-brown-400 text-sm flex items-center justify-center hover:text-red-500 hover:bg-red-50 hover:border-red-200 transition-colors flex-shrink-0"
            whileTap={{ scale: 0.95 }}
            onClick={() => setShowConfirm(true)}
            title="Supprimer"
          >
            ✕
          </motion.button>
        </div>
      </div>

      {/* Delete confirm overlay */}
      <AnimatePresence>
        {showConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-beige-50/95 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center"
          >
            <p className="text-brown-900 font-medium mb-1">Supprimer ce formulaire ?</p>
            <p className="text-xs text-brown-400 mb-5">Cette action est irréversible.</p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowConfirm(false)}
                className="px-5 py-2 rounded-lg bg-beige-200 text-brown-700 text-sm"
              >
                Annuler
              </button>
              <button
                onClick={onDelete}
                className="px-5 py-2 rounded-lg bg-red-500 text-white text-sm"
              >
                Supprimer
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function DashboardContent() {
  const [forms, setForms] = useState<Form[]>([]);
  const [loaded, setLoaded] = useState(false);
  const searchParams = useSearchParams();
  const router = useRouter();
  const isCreated = searchParams.get('created') === '1';
  const [showToast, setShowToast] = useState(isCreated);
  const [showCopyToast, setShowCopyToast] = useState(false);

  const handleCopied = () => {
    setShowCopyToast(true);
    setTimeout(() => setShowCopyToast(false), 3000);
  };

  useEffect(() => {
    // Try server first (cross-device), fallback to localStorage
    fetch('/api/forms')
      .then((r) => r.json())
      .then((serverForms) => {
        if (Array.isArray(serverForms) && serverForms.length > 0) {
          setForms(serverForms);
        } else {
          setForms(getForms());
        }
      })
      .catch(() => setForms(getForms()))
      .finally(() => setLoaded(true));
  }, []);

  useEffect(() => {
    if (!isCreated) return;
    router.replace('/dashboard');
    const t = setTimeout(() => setShowToast(false), 4000);
    return () => clearTimeout(t);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleDelete = (id: string) => {
    deleteForm(id);
    setForms(getForms());
  };

  const totalResponses = forms.reduce((sum, f) => sum + (f.responses?.length ?? 0), 0);
  const totalPayments = forms.reduce(
    (sum, f) =>
      sum + (f.responses?.filter((r) => r.paymentStatus === 'paid').reduce((s, r) => s + (r.paymentAmount ?? 0), 0) ?? 0),
    0
  );

  return (
    <div className="min-h-screen pt-24 pb-20">
      {/* Toast succès formulaire créé */}
      <AnimatePresence>
        {showToast && (
          <motion.div
            initial={{ y: -80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -80, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 400, damping: 28 }}
            className="fixed top-20 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-6 py-3.5 rounded-2xl bg-green-500 text-white shadow-xl shadow-green-500/20"
          >
            <span className="text-lg">✓</span>
            <span className="text-sm font-medium">Formulaire créé avec succès !</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Toast copie de lien */}
      <AnimatePresence>
        {showCopyToast && (
          <motion.div
            initial={{ y: -80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -80, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 400, damping: 28 }}
            className="fixed top-20 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-6 py-3.5 rounded-2xl bg-brown-900 text-beige-50 shadow-xl shadow-brown-900/20 whitespace-nowrap"
          >
            <span className="text-lg">🔗</span>
            <span className="text-sm font-medium">Le lien a bien été copié !</span>
          </motion.div>
        )}
      </AnimatePresence>
      <div className="max-w-6xl mx-auto px-6">
        {/* Header */}
        <motion.div
          className="mb-12"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <h1
            className="text-5xl font-light text-brown-900 mb-2"
            style={{ fontFamily: 'var(--font-cormorant)' }}
          >
            Votre <em className="gradient-text">Dashboard</em>
          </h1>
          <p className="text-brown-500">Gérez vos formulaires et suivez vos réponses.</p>
        </motion.div>

        {/* Stats */}
        {loaded && (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-12">
            <StatCard label="Formulaires" value={forms.length} icon="◈" delay={0.1} />
            <StatCard label="Réponses" value={totalResponses} icon="✦" delay={0.15} />
            <StatCard label="Revenus (€)" value={totalPayments} icon="◆" delay={0.2} />
          </div>
        )}

        {/* Forms grid */}
        <div className="flex items-center justify-between mb-6">
          <h2
            className="text-2xl font-light text-brown-900"
            style={{ fontFamily: 'var(--font-cormorant)' }}
          >
            Mes formulaires
          </h2>
          <Link href="/builder">
            <motion.button
              className="btn-liquid px-5 py-2.5 bg-brown-900 text-beige-50 rounded-xl text-sm font-medium overflow-hidden"
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
            >
              <span className="relative z-10">+ Nouveau</span>
            </motion.button>
          </Link>
        </div>

        <AnimatePresence mode="popLayout">
          {forms.length === 0 && loaded ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex flex-col items-center justify-center py-24 text-center rounded-3xl border-2 border-dashed border-beige-300"
            >
              <div className="text-5xl text-beige-300 mb-6 float-1">◈</div>
              <h3
                className="text-2xl font-light text-brown-600 mb-3"
                style={{ fontFamily: 'var(--font-cormorant)' }}
              >
                Aucun formulaire pour l&apos;instant
              </h3>
              <p className="text-brown-400 text-sm mb-8">Créez votre premier formulaire en quelques secondes.</p>
              <Link href="/builder">
                <motion.button
                  className="btn-liquid px-8 py-3.5 bg-brown-900 text-beige-50 rounded-xl text-sm font-medium overflow-hidden"
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                >
                  <span className="relative z-10">Créer mon premier formulaire →</span>
                </motion.button>
              </Link>
            </motion.div>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {forms.map((form, i) => (
                <FormCard
                  key={form.id}
                  form={form}
                  index={i}
                  onDelete={() => handleDelete(form.id)}
                  onCopied={handleCopied}
                />
              ))}
            </div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <Suspense>
      <DashboardContent />
    </Suspense>
  );
}
