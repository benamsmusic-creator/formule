'use client';
import { useState, useEffect, Suspense } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import { getForms } from '@/lib/store';
import { Form } from '@/lib/types';
import { formatDate, exportResponsesToCSV, generateId } from '@/lib/utils';

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

function FormCard({
  form, onArchive, onToggleDisabled, index, onCopied, onDuplicate,
}: {
  form: Form;
  onArchive: () => void;
  onToggleDisabled: () => void;
  index: number;
  onCopied: () => void;
  onDuplicate: () => void;
}) {
  const [showConfirm, setShowConfirm] = useState(false);

  // Fix revenus: compter carte ET espèces (la liste d'attente ne paie pas)
  const totalRevenue = (form.responses ?? [])
    .filter((r) => r.paymentStatus === 'paid' || r.paymentStatus === 'cash')
    .reduce((sum, r) => sum + (r.paymentAmount ?? 0), 0);

  const hasPayment = form.fields.some((f) => f.type === 'payment');

  // Confirmés vs liste d'attente
  const allResponses = form.responses ?? [];
  const waitlistCount = allResponses.filter((r) => (r.data as Record<string, unknown>)?._waitlist === 'true').length;
  const confirmedCount = allResponses.length - waitlistCount;
  const confirmedGuests = allResponses
    .filter((r) => (r.data as Record<string, unknown>)?._waitlist !== 'true')
    .reduce((s, r) => s + (parseInt(((r.data as Record<string, string>)?._guestCount) || '1', 10) || 1), 0);

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -40, scale: 0.95 }}
      transition={{ delay: index * 0.07, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className={`group relative bg-beige-50 rounded-2xl border overflow-hidden transition-all duration-300 ${
        form.disabled ? 'border-orange-200 opacity-75' : 'border-beige-200 hover:border-gold-400/40'
      }`}
      whileHover={{ y: -4, boxShadow: '0 20px 60px rgba(44,24,16,0.08)' }}
      layout
    >
      <div className={`h-0.5 bg-gradient-to-r ${form.disabled ? 'from-orange-300' : 'from-gold-400/60'} to-transparent`} />
      <div className="p-6">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div className="flex-1 min-w-0">
            <h3 className="text-xl font-medium text-brown-900 truncate mb-0.5" style={{ fontFamily: 'var(--font-cormorant)' }}>
              {form.title}
            </h3>
            {form.description && <p className="text-xs text-brown-400 truncate">{form.description}</p>}
          </div>
          <div className="flex items-center gap-1.5 flex-shrink-0">
            {form.disabled && (
              <span className="text-xs px-2 py-1 rounded-full bg-orange-100 text-orange-600 border border-orange-200 font-medium">
                Désactivé
              </span>
            )}
            {hasPayment && !form.disabled && (
              <span className="text-xs px-2 py-1 rounded-full bg-gold-400/10 text-gold-600 border border-gold-400/20">◆ Stripe</span>
            )}
            {waitlistCount > 0 && (
              <span className="text-xs px-2 py-1 rounded-full bg-red-50 text-red-600 border border-red-200 font-medium whitespace-nowrap">
                ⏳ {waitlistCount} en attente
              </span>
            )}
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 mb-5">
          {[
            { label: 'Confirmés', value: confirmedCount, icon: '✦' },
            { label: 'Invités', value: confirmedGuests, icon: '👤' },
            { label: 'Revenus', value: totalRevenue > 0 ? `${totalRevenue}€` : '—', icon: '◆' },
          ].map((stat) => (
            <div key={stat.label} className="p-3 rounded-xl bg-beige-100 text-center">
              <p className="text-xs text-gold-500 mb-1">{stat.icon}</p>
              <p className="text-base font-medium text-brown-900">{stat.value}</p>
              <p className="text-[10px] text-brown-400 uppercase tracking-wide">{stat.label}</p>
            </div>
          ))}
        </div>

        <div className="flex items-center justify-between gap-2 mb-4">
          <p className="text-xs text-brown-300">Créé le {formatDate(form.createdAt)}</p>
          {typeof form.maxCapacity === 'number' && form.maxCapacity > 0 && (
            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
              confirmedGuests >= form.maxCapacity ? 'bg-red-50 text-red-600 border border-red-200' : 'bg-beige-100 text-brown-500 border border-beige-200'
            }`}>
              {confirmedGuests}/{form.maxCapacity} places
            </span>
          )}
        </div>

        {/* Row 1 */}
        <div className="grid grid-cols-2 gap-2 mb-2">
          <Link href={`/forms/${form.id}`}>
            <motion.button className="w-full py-3 rounded-xl border-2 border-beige-200 text-brown-700 text-xs font-semibold hover:border-gold-400/50 hover:bg-beige-100 transition-colors" whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.98 }}>
              Voir →
            </motion.button>
          </Link>
          <Link href={`/dashboard/responses/${form.id}`}>
            <motion.button className="w-full py-3 rounded-xl bg-brown-900 text-beige-50 text-xs font-semibold" whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.98 }}>
              Réponses {(form.responses?.length ?? 0) > 0 ? `(${form.responses.length})` : ''}
            </motion.button>
          </Link>
        </div>

        {/* Row 2 */}
        <div className="flex items-center gap-2">
          <Link href={`/builder?id=${form.id}`} className="flex-1">
            <motion.button className="w-full py-2.5 rounded-xl bg-beige-100 border border-beige-200 text-brown-600 text-xs font-medium hover:border-gold-400/40 transition-colors" whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.98 }}>
              Éditer
            </motion.button>
          </Link>

          {/* Disable toggle */}
          <motion.button
            className={`h-9 px-3 rounded-xl border text-xs font-medium transition-colors flex-shrink-0 ${
              form.disabled
                ? 'bg-orange-50 border-orange-200 text-orange-600 hover:bg-orange-100'
                : 'bg-beige-100 border-beige-200 text-brown-500 hover:border-gold-400/40'
            }`}
            whileTap={{ scale: 0.95 }}
            onClick={onToggleDisabled}
            title={form.disabled ? 'Réactiver' : 'Désactiver'}
            aria-label={form.disabled ? 'Réactiver le formulaire' : 'Désactiver le formulaire'}
          >
            {form.disabled ? '▶ Activer' : '⏸ Off'}
          </motion.button>

          <motion.button
            className="w-10 h-9 rounded-xl bg-beige-100 border border-beige-200 text-brown-500 text-sm flex items-center justify-center hover:bg-beige-200 transition-colors flex-shrink-0"
            whileTap={{ scale: 0.95 }}
            onClick={() => { navigator.clipboard.writeText(`${window.location.origin}/forms/${form.id}`); onCopied(); }}
            title="Copier le lien"
            aria-label="Copier le lien du formulaire"
          >
            🔗
          </motion.button>

          <motion.button
            className="w-10 h-9 rounded-xl bg-beige-100 border border-beige-200 text-brown-500 text-sm flex items-center justify-center hover:bg-green-50 hover:text-green-600 hover:border-green-200 transition-colors flex-shrink-0 disabled:opacity-40 disabled:cursor-not-allowed"
            whileTap={{ scale: 0.95 }}
            onClick={() => exportResponsesToCSV(form)}
            disabled={(form.responses?.length ?? 0) === 0}
            title="Exporter les réponses en CSV (Excel)"
            aria-label="Exporter les réponses en CSV"
          >
            📥
          </motion.button>

          <motion.button
            className="w-10 h-9 rounded-xl bg-beige-100 border border-beige-200 text-brown-500 text-sm flex items-center justify-center hover:bg-beige-200 transition-colors flex-shrink-0"
            whileTap={{ scale: 0.95 }}
            onClick={onDuplicate}
            title="Dupliquer"
            aria-label="Dupliquer le formulaire"
          >
            ⧉
          </motion.button>

          <motion.button
            className="w-10 h-9 rounded-xl bg-beige-100 border border-beige-200 text-brown-400 text-sm flex items-center justify-center hover:text-red-500 hover:bg-red-50 hover:border-red-200 transition-colors flex-shrink-0"
            whileTap={{ scale: 0.95 }}
            onClick={() => setShowConfirm(true)}
            title="Archiver"
            aria-label="Archiver le formulaire"
          >
            🗂
          </motion.button>
        </div>
      </div>

      {/* Archive confirm overlay */}
      <AnimatePresence>
        {showConfirm && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="absolute inset-0 bg-beige-50/95 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center"
          >
            <p className="text-brown-900 font-medium mb-1">Archiver ce formulaire ?</p>
            <p className="text-xs text-brown-400 mb-5">Il sera conservé dans vos archives et pourra être restauré.</p>
            <div className="flex gap-3">
              <button onClick={() => setShowConfirm(false)} className="px-5 py-2 rounded-lg bg-beige-200 text-brown-700 text-sm">Annuler</button>
              <button onClick={() => { setShowConfirm(false); onArchive(); }} className="px-5 py-2 rounded-lg bg-brown-800 text-white text-sm">Archiver</button>
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
  const [showArchives, setShowArchives] = useState(false);
  const [search, setSearch] = useState('');
  const [me, setMe] = useState<{ superAdmin: boolean; orgName: string | null } | null>(null);
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
    fetch('/api/forms')
      .then((r) => r.json())
      .then((serverForms) => {
        if (Array.isArray(serverForms)) setForms(serverForms);
        else setForms(getForms());
      })
      .catch(() => setForms(getForms()))
      .finally(() => setLoaded(true));
  }, []);

  useEffect(() => {
    fetch('/api/me')
      .then((r) => r.json())
      .then((d) => setMe({ superAdmin: !!d.superAdmin, orgName: d.orgName ?? null }))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!isCreated) return;
    router.replace('/dashboard');
    const t = setTimeout(() => setShowToast(false), 4000);
    return () => clearTimeout(t);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Raccourcis clavier (#31)
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      // Ignore si l'utilisateur est dans un champ de saisie
      const tag = (e.target as HTMLElement).tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      switch (e.key) {
        case 'n': case 'N': e.preventDefault(); router.push('/builder'); break;
        case '/': e.preventDefault(); document.querySelector<HTMLInputElement>('input[placeholder*="Rechercher"]')?.focus(); break;
        case 'g': case 'G': e.preventDefault(); router.push('/dashboard/gala'); break;
        case 'c': case 'C': e.preventDefault(); router.push('/dashboard/crm'); break;
      }
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [router]);

  // Dupliquer un formulaire (pratique pour les événements récurrents)
  const handleDuplicate = async (form: Form) => {
    const copy: Form = {
      ...form,
      id: generateId(),
      title: `${form.title} (copie)`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      responses: [],
      archived: false,
      disabled: false,
    };
    setForms((prev) => [copy, ...prev]);
    fetch('/api/forms', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(copy) }).catch(() => {});
  };

  // Archive — met à jour l'état immédiatement, sans re-fetch
  const handleArchive = (id: string) => {
    fetch('/api/forms', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, is_archived: true }),
    }).catch(() => {});
    setForms((prev) => prev.map((f) => f.id === id ? { ...f, archived: true } : f));
  };

  // Restore
  const handleRestore = (id: string) => {
    fetch('/api/forms', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, is_archived: false }),
    }).catch(() => {});
    setForms((prev) => prev.map((f) => f.id === id ? { ...f, archived: false } : f));
  };

  // Désactiver / Réactiver — état immédiat
  const handleToggleDisabled = (id: string, current: boolean) => {
    fetch('/api/forms', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, is_disabled: !current }),
    }).catch(() => {});
    setForms((prev) => prev.map((f) => f.id === id ? { ...f, disabled: !current } : f));
  };

  const q = search.trim().toLowerCase();
  const matchesSearch = (f: Form) => {
    if (!q) return true;
    if (f.title.toLowerCase().includes(q) || (f.description ?? '').toLowerCase().includes(q)) return true;
    // Recherche globale (#29) — cherche aussi dans les noms/emails des participants
    return (f.responses ?? []).some((r) => {
      const d = r.data as Record<string, string>;
      const hay = [d._firstName, d._lastName, d._fullName, d._email, d._phone].filter(Boolean).join(' ').toLowerCase();
      return hay.includes(q);
    });
  };
  const activeForms = forms.filter((f) => !f.archived && matchesSearch(f));
  const archivedForms = forms.filter((f) => f.archived && matchesSearch(f));

  const totalResponses = activeForms.reduce((sum, f) => sum + (f.responses?.length ?? 0), 0);
  // Fix: compter carte ET espèces
  const totalPayments = activeForms.reduce(
    (sum, f) =>
      sum + (f.responses?.filter((r) => r.paymentStatus === 'paid' || r.paymentStatus === 'cash')
        .reduce((s, r) => s + (r.paymentAmount ?? 0), 0) ?? 0),
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
            role="status" aria-live="polite"
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
            role="status" aria-live="polite"
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
          <p className="text-xs uppercase tracking-widest text-gold-600 mb-2">
            {new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
          </p>
          <div className="flex flex-wrap items-end justify-between gap-3">
            <h1
              className="text-4xl sm:text-5xl font-light text-brown-900"
              style={{ fontFamily: 'var(--font-cormorant)' }}
            >
              Tableau de <em className="gradient-text">bord</em>
            </h1>
            <div className="flex items-center gap-2">
              {me?.orgName && <span className="text-xs px-3 py-1.5 rounded-full bg-gold-400/10 text-gold-700 border border-gold-400/20 font-medium">{me.orgName}</span>}
              {me?.superAdmin && <span className="text-xs px-3 py-1.5 rounded-full bg-brown-900 text-beige-50 font-medium">👑 Super-admin</span>}
            </div>
          </div>
          <p className="text-brown-500 text-sm mt-2">Vue d’ensemble de votre communauté.</p>
        </motion.div>

        {/* Stats */}
        {loaded && (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-12">
            <StatCard label="Formulaires" value={activeForms.length} icon="◈" delay={0.1} />
            <StatCard label="Réponses" value={totalResponses} icon="✦" delay={0.15} />
            <StatCard label="Revenus (€)" value={totalPayments} icon="◆" delay={0.2} />
          </div>
        )}

        {/* Revenus sur 14 jours */}
        {loaded && (() => {
          const DAYS = 14;
          const today = new Date(); today.setHours(0, 0, 0, 0);
          const buckets = Array.from({ length: DAYS }, (_, i) => {
            const d = new Date(today); d.setDate(d.getDate() - (DAYS - 1 - i));
            return { d, total: 0 };
          });
          activeForms.forEach((f) => (f.responses ?? []).forEach((r) => {
            if (r.paymentStatus !== 'paid' && r.paymentStatus !== 'cash') return;
            if (!r.submittedAt) return;
            const t = new Date(r.submittedAt); t.setHours(0, 0, 0, 0);
            const b = buckets.find((x) => x.d.getTime() === t.getTime());
            if (b) b.total += r.paymentAmount ?? 0;
          }));
          const sum = buckets.reduce((s, b) => s + b.total, 0);
          if (sum === 0) return null;
          const max = Math.max(...buckets.map((b) => b.total), 1);
          return (
            <motion.div
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.23 }}
              className="mb-12 p-6 rounded-2xl bg-beige-50 border border-beige-200"
            >
              <div className="flex items-end justify-between mb-5">
                <h2 className="text-lg font-medium text-brown-900" style={{ fontFamily: 'var(--font-cormorant)' }}>Revenus · 14 derniers jours</h2>
                <span className="text-sm font-semibold text-gold-700">{sum} €</span>
              </div>
              <div className="flex items-end gap-1.5 h-28">
                {buckets.map((b, i) => (
                  <div key={i} className="flex-1 flex flex-col items-center justify-end h-full group relative">
                    <motion.div
                      className="w-full rounded-t-md bg-gradient-to-t from-gold-500 to-gold-300 min-h-[2px]"
                      initial={{ height: 0 }} animate={{ height: `${(b.total / max) * 100}%` }}
                      transition={{ delay: 0.3 + i * 0.03, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                    />
                    {b.total > 0 && (
                      <span className="absolute -top-5 text-[10px] text-brown-500 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">{b.total}€</span>
                    )}
                  </div>
                ))}
              </div>
              <div className="flex justify-between mt-2 text-[10px] text-brown-300">
                <span>{buckets[0].d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}</span>
                <span>{buckets[DAYS - 1].d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}</span>
              </div>
            </motion.div>
          );
        })()}

        {/* Aperçu : inscriptions par événement */}
        {loaded && (() => {
          const data = activeForms
            .map((f) => ({
              title: f.title,
              count: (f.responses ?? []).filter((r) => (r.data as Record<string, unknown>)?._waitlist !== 'true').length,
            }))
            .filter((d) => d.count > 0)
            .sort((a, b) => b.count - a.count)
            .slice(0, 6);
          if (data.length === 0) return null;
          const max = Math.max(...data.map((d) => d.count));
          return (
            <motion.div
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}
              className="mb-12 p-6 rounded-2xl bg-beige-50 border border-beige-200"
            >
              <h2 className="text-lg font-medium text-brown-900 mb-4" style={{ fontFamily: 'var(--font-cormorant)' }}>
                Inscriptions par événement
              </h2>
              <div className="space-y-3">
                {data.map((d, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <span className="text-xs text-brown-500 w-32 sm:w-40 truncate flex-shrink-0">{d.title}</span>
                    <div className="flex-1 h-6 rounded-lg bg-beige-100 overflow-hidden">
                      <motion.div
                        className="h-full rounded-lg bg-gradient-to-r from-gold-500 to-gold-400"
                        initial={{ width: 0 }} animate={{ width: `${(d.count / max) * 100}%` }}
                        transition={{ delay: 0.3 + i * 0.06, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                      />
                    </div>
                    <span className="text-sm font-semibold text-brown-900 w-8 text-right flex-shrink-0">{d.count}</span>
                  </div>
                ))}
              </div>
            </motion.div>
          );
        })()}

        {/* Résumé du jour + raccourcis */}
        {loaded && (() => {
          const today = new Date(); today.setHours(0, 0, 0, 0);
          // Inscriptions des dernières 24h (toutes confirmées)
          const since = Date.now() - 24 * 3600 * 1000;
          const recent = activeForms.reduce((sum, f) => sum + (f.responses ?? []).filter((r) => {
            const t = r.submittedAt ? new Date(r.submittedAt).getTime() : 0;
            return t >= since;
          }).length, 0);
          // Événements aujourd'hui (champ event_date présent et = aujourd'hui)
          const eventsToday = activeForms.filter((f) => {
            const ed = f.fields.find((x) => x.type === 'event_date')?.presetValue;
            if (!ed) return false;
            const d = new Date(ed); if (isNaN(d.getTime())) return false;
            d.setHours(0, 0, 0, 0);
            return d.getTime() === today.getTime();
          });
          // Listes d'attente cumulées
          const waitTotal = activeForms.reduce((s, f) => s + (f.responses ?? []).filter((r) => (r.data as Record<string, unknown>)?._waitlist === 'true').length, 0);
          return (
            <motion.div
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.22 }}
              className="mb-12 p-6 rounded-2xl bg-beige-50 border border-beige-200"
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-medium text-brown-900" style={{ fontFamily: 'var(--font-cormorant)' }}>Aujourd’hui</h2>
                <span className="text-xs text-brown-400">{new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })}</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-4 rounded-xl bg-beige-100 border border-beige-200">
                  <p className="text-2xl font-light text-brown-900">{recent}</p>
                  <p className="text-xs text-brown-500">nouvelle(s) inscription(s) · 24h</p>
                </div>
                <div className="p-4 rounded-xl bg-beige-100 border border-beige-200">
                  <p className="text-2xl font-light text-brown-900">{eventsToday.length}</p>
                  <p className="text-xs text-brown-500">événement(s) aujourd’hui</p>
                </div>
                <div className={`p-4 rounded-xl border ${waitTotal > 0 ? 'bg-red-50 border-red-200' : 'bg-beige-100 border-beige-200'}`}>
                  <p className={`text-2xl font-light ${waitTotal > 0 ? 'text-red-600' : 'text-brown-900'}`}>{waitTotal}</p>
                  <p className="text-xs text-brown-500">en liste d’attente</p>
                </div>
              </div>
              {eventsToday.length > 0 && (
                <div className="mt-4 flex flex-wrap gap-2">
                  {eventsToday.map((f) => (
                    <Link key={f.id} href={`/dashboard/responses/${f.id}`} className="text-xs px-3 py-1.5 rounded-full bg-gold-400/10 border border-gold-400/20 text-gold-700 hover:bg-gold-400/20 transition-colors">
                      📅 {f.title} →
                    </Link>
                  ))}
                </div>
              )}
              {/* Raccourcis */}
              <div className="mt-5 pt-5 border-t border-beige-200 flex flex-wrap gap-2">
                {[
                  { href: '/builder', icon: '➕', label: 'Nouveau formulaire' },
                  { href: '/dashboard/crm', icon: '📇', label: 'CRM' },
                  { href: '/dashboard/gala', icon: '🥂', label: 'Gala' },
                  { href: '/annonces', icon: '📢', label: 'Annonce' },
                  { href: '/newsletter', icon: '📣', label: 'Newsletter' },
                ].map((it) => (
                  <Link key={it.href} href={it.href} className="inline-flex items-center gap-2 text-sm px-3.5 py-2 rounded-xl bg-beige-100 border border-beige-200 text-brown-700 hover:border-gold-400/40 hover:bg-beige-50 transition-colors">
                    <span>{it.icon}</span>{it.label}
                  </Link>
                ))}
              </div>
            </motion.div>
          );
        })()}

        {/* Recherche */}
        {loaded && forms.length > 4 && (
          <div className="relative mb-6">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-brown-300 text-sm">🔍</span>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher un formulaire, un participant…"
              aria-label="Recherche globale — formulaires et participants"
              className="w-full pl-9 pr-4 py-3 rounded-2xl bg-beige-50 border border-beige-200 text-sm text-brown-900 placeholder:text-brown-300 focus:outline-none focus:border-gold-400 transition-colors"
            />
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
          <div className="flex items-center gap-2">
            {me?.superAdmin && (
              <Link href="/clients">
                <motion.button
                  className="px-5 py-2.5 border border-gold-400/40 text-brown-700 rounded-xl text-sm font-medium hover:bg-gold-400/10 transition-colors"
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                >
                  👥 Clients
                </motion.button>
              </Link>
            )}
            <Link href="/dashboard/crm">
              <motion.button
                className="px-5 py-2.5 border border-gold-400/40 text-brown-700 rounded-xl text-sm font-medium hover:bg-gold-400/10 transition-colors"
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
              >
                CRM →
              </motion.button>
            </Link>
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
        </div>

        <AnimatePresence mode="popLayout">
          {activeForms.length === 0 && loaded ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex flex-col items-center justify-center py-24 text-center rounded-3xl border-2 border-dashed border-beige-300"
            >
              <div className="text-5xl text-beige-300 mb-6 float-1">◈</div>
              <h3 className="text-2xl font-light text-brown-600 mb-3" style={{ fontFamily: 'var(--font-cormorant)' }}>
                Aucun formulaire pour l&apos;instant
              </h3>
              <p className="text-brown-400 text-sm mb-8">Créez votre premier formulaire en quelques secondes.</p>
              <Link href="/builder">
                <motion.button className="btn-liquid px-8 py-3.5 bg-brown-900 text-beige-50 rounded-xl text-sm font-medium overflow-hidden" whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
                  <span className="relative z-10">Créer mon premier formulaire →</span>
                </motion.button>
              </Link>
            </motion.div>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {activeForms.map((form, i) => (
                <FormCard
                  key={form.id}
                  form={form}
                  index={i}
                  onArchive={() => handleArchive(form.id)}
                  onToggleDisabled={() => handleToggleDisabled(form.id, !!form.disabled)}
                  onCopied={handleCopied}
                  onDuplicate={() => handleDuplicate(form)}
                />
              ))}
            </div>
          )}
        </AnimatePresence>

        {/* Archives */}
        {loaded && archivedForms.length > 0 && (
          <div className="mt-14">
            <button
              onClick={() => setShowArchives((v) => !v)}
              className="flex items-center gap-2 text-sm text-brown-400 hover:text-brown-700 transition-colors mb-4"
            >
              <span>{showArchives ? '▾' : '▸'}</span>
              <span>Archives ({archivedForms.length})</span>
            </button>
            <AnimatePresence>
              {showArchives && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden"
                >
                  <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {archivedForms.map((form) => (
                      <div key={form.id} className="p-4 rounded-2xl bg-beige-100 border border-beige-200 opacity-60">
                        <p className="font-medium text-brown-700 text-sm truncate mb-1">{form.title}</p>
                        <p className="text-xs text-brown-400 mb-3">{form.responses?.length ?? 0} réponse(s)</p>
                        <button
                          onClick={() => handleRestore(form.id)}
                          className="text-xs text-brown-600 hover:text-brown-900 font-medium transition-colors border border-beige-300 px-3 py-1.5 rounded-lg hover:bg-beige-200"
                        >
                          ↩ Restaurer
                        </button>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
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
