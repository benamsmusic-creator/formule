'use client';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Form, FormResponse } from '@/lib/types';
import { getForm } from '@/lib/store';
import { formatDate } from '@/lib/utils';

/* ─── Noms lisibles pour les champs système ───────────────────── */
const FIELD_LABELS: Record<string, string> = {
  _civility:    'Civilité',
  _firstName:   'Prénom',
  _lastName:    'Nom',
  _fullName:    'Nom complet',
  _phone:       'Téléphone',
  _address:     'Adresse',
  _guestCount:  'Nombre de personnes',
  _totalAmount: 'Montant total (€)',
};

// Champs à masquer car redondants avec l'en-tête
const HIDDEN_FIELDS = new Set(['_fullName', '_civility', '_firstName', '_lastName']);

function fieldLabel(key: string): string {
  return FIELD_LABELS[key] ?? key;
}

function paymentBadge(resp: FormResponse) {
  const { paymentStatus, paymentMethod, paymentAmount } = resp;
  if (paymentAmount === undefined && !paymentMethod) return null;

  const amount = paymentAmount !== undefined ? `${paymentAmount} €` : '';

  if (paymentMethod === 'card' || paymentStatus === 'paid') {
    return { label: `✓ ${amount} — Carte`, color: 'bg-green-100 text-green-700' };
  }
  if (paymentMethod === 'cash' || paymentStatus === 'cash') {
    return { label: `${amount} — Espèces`, color: 'bg-amber-100 text-amber-700' };
  }
  if (amount) {
    return { label: `${amount} en attente`, color: 'bg-beige-200 text-brown-500' };
  }
  return null;
}

export default function ResponsesPage() {
  const { id } = useParams<{ id: string }>();
  const [form, setForm] = useState<Form | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [checked, setChecked] = useState<Record<string, boolean>>({});

  const toggleCheck = async (rid: string) => {
    const next = !checked[rid];
    setChecked((c) => ({ ...c, [rid]: next }));
    try {
      await fetch('/api/checkin', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ responseId: rid, value: next }) });
    } catch { /* ignore */ }
  };

  useEffect(() => {
    fetch(`/api/forms/${id}`)
      .then((r) => r.ok ? r.json() : null)
      .then((data: Form | null) => {
        if (data?.id) setForm(data);
        else {
          const local = getForm(id);
          if (local) setForm(local);
          else setError(true);
        }
      })
      .catch(() => {
        const local = getForm(id);
        if (local) setForm(local);
        else setError(true);
      })
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    if (!form) return;
    setChecked(Object.fromEntries((form.responses ?? []).map((r) => [r.id, !!r.checkedIn])));
  }, [form]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-6 h-6 rounded-full border-2 border-gold-400 border-t-transparent animate-spin" />
      </div>
    );
  }

  if (error || !form) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4">
        <p className="text-brown-500">Formulaire introuvable.</p>
        <Link href="/dashboard" className="text-sm text-gold-600 hover:underline">← Retour au dashboard</Link>
      </div>
    );
  }

  const responses = form.responses ?? [];
  const arrived = Object.values(checked).filter(Boolean).length;

  return (
    <div className="min-h-screen pt-24 pb-20">
      <div className="max-w-4xl mx-auto px-6">
        {/* Header */}
        <motion.div
          className="mb-10"
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        >
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-1.5 text-sm text-brown-400 hover:text-brown-700 transition-colors mb-6"
          >
            ← Retour au dashboard
          </Link>
          <h1
            className="text-4xl font-light text-brown-900 mb-1"
            style={{ fontFamily: 'var(--font-cormorant)' }}
          >
            Réponses — <em className="gradient-text not-italic">{form.title}</em>
          </h1>
          <p className="text-brown-500 text-sm">
            {responses.length} inscription{responses.length !== 1 ? 's' : ''} enregistrée{responses.length !== 1 ? 's' : ''}
            {arrived > 0 && <span className="text-green-600"> · {arrived} arrivé{arrived !== 1 ? 's' : ''} ✓</span>}
          </p>
          <div className="flex flex-wrap items-center gap-2 mt-3 print:hidden">
            {form.fields.some((f) => f.type === 'table_reservation') && (
              <Link href={`/plan/${form.id}`} className="inline-flex items-center text-sm font-medium text-gold-700 border border-gold-400/30 px-4 py-2 rounded-xl hover:bg-gold-400/10 transition-colors">
                🪑 Plan de salle
              </Link>
            )}
            {responses.length > 0 && (
              <button onClick={() => window.print()} className="inline-flex items-center text-sm font-medium text-brown-700 border border-beige-300 px-4 py-2 rounded-xl hover:bg-beige-100 transition-colors">
                🖨️ Imprimer la liste
              </button>
            )}
          </div>
        </motion.div>

        {/* Empty state */}
        {responses.length === 0 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center justify-center py-24 rounded-3xl border-2 border-dashed border-beige-300 text-center"
          >
            <div className="text-5xl text-beige-300 mb-5 float-1">✦</div>
            <p className="text-2xl font-light text-brown-600 mb-2" style={{ fontFamily: 'var(--font-cormorant)' }}>
              Aucune inscription pour l&apos;instant
            </p>
            <p className="text-sm text-brown-400">Les inscriptions apparaîtront ici dès qu&apos;un participant soumettra le formulaire.</p>
          </motion.div>
        )}

        {/* Responses list */}
        <div className="space-y-3">
          <AnimatePresence>
            {responses.map((resp: FormResponse, i: number) => {
              const isOpen = expanded === resp.id;
              const data = resp.data ?? {};

              // Nom affiché dans l'en-tête
              const fullName = data._fullName as string | undefined;
              const firstName = data._firstName as string | undefined;
              const lastName = data._lastName as string | undefined;
              const civility = data._civility as string | undefined;
              const displayName = fullName
                ?? (firstName && lastName ? `${civility ? civility + ' ' : ''}${firstName} ${lastName}` : undefined)
                ?? (data.email as string | undefined)
                ?? `Inscription #${i + 1}`;

              const phone = data._phone as string | undefined;
              const guests = data._guestCount as string | undefined;

              const badge = paymentBadge(resp);

              // Champs à afficher dans le détail (exclut les champs masqués)
              const detailEntries = Object.entries(data).filter(
                ([key]) => !HIDDEN_FIELDS.has(key)
              );

              return (
                <motion.div
                  key={resp.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05, duration: 0.4 }}
                  className="print-row bg-beige-50 border border-beige-200 rounded-2xl overflow-hidden"
                >
                  {/* Row header */}
                  <button
                    onClick={() => setExpanded(isOpen ? null : resp.id)}
                    className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-beige-100/60 transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-8 h-8 rounded-full bg-gold-400/15 flex items-center justify-center flex-shrink-0">
                        <span className="text-gold-600 text-xs font-bold">{i + 1}</span>
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-brown-900 truncate">{displayName}</p>
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-xs text-brown-400">{formatDate(resp.submittedAt)}</p>
                          {phone && <p className="text-xs text-brown-400">· {phone}</p>}
                          {guests && parseInt(guests) > 1 && (
                            <p className="text-xs text-brown-400">· {guests} pers.</p>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0 ml-4">
                      {checked[resp.id] && (
                        <span className="text-xs px-2.5 py-1 rounded-full font-medium bg-green-100 text-green-700 border border-green-200">✓ Arrivé</span>
                      )}
                      {badge && (
                        <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${badge.color}`}>
                          {badge.label}
                        </span>
                      )}
                      <span className="text-brown-400 text-xs">{isOpen ? '▲' : '▼'}</span>
                    </div>
                  </button>

                  {/* Expanded details */}
                  <AnimatePresence>
                    {isOpen && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.25, ease: 'easeInOut' }}
                        className="overflow-hidden"
                      >
                        <div className="px-5 pb-5 pt-1 border-t border-beige-200">
                          <div className="grid sm:grid-cols-2 gap-3 mt-3">
                            {detailEntries.map(([key, value]) => (
                              <div key={key} className="p-3 rounded-xl bg-beige-100">
                                <p className="text-[10px] text-brown-400 uppercase tracking-wide mb-0.5">
                                  {fieldLabel(key)}
                                </p>
                                <p className="text-sm text-brown-900 break-words">{String(value)}</p>
                              </div>
                            ))}
                          </div>
                          <button
                            onClick={() => toggleCheck(resp.id)}
                            className={`mt-4 w-full py-2.5 rounded-xl text-sm font-semibold transition-colors ${
                              checked[resp.id] ? 'bg-green-600 text-white hover:bg-green-700' : 'bg-brown-900 text-beige-50 hover:opacity-90'
                            }`}
                          >
                            {checked[resp.id] ? '✓ Présent — annuler' : 'Pointer comme arrivé'}
                          </button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
