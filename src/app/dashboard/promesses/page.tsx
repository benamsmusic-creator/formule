'use client';
import { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';

/* ─── Types ─────────────────────────────────────────────────── */
interface Pledge {
  id: string;
  donor_name: string;
  donor_email: string | null;
  donor_phone: string | null;
  amount: number;
  paid_amount: number;
  status: 'pending' | 'partial' | 'paid';
  reason: string | null;
  due_date: string | null;
  note: string | null;
  created_at: string;
}

const STATUS_META: Record<Pledge['status'], { label: string; cls: string }> = {
  pending: { label: 'À régler', cls: 'bg-amber-100 text-amber-800 border-amber-200' },
  partial: { label: 'Partiel', cls: 'bg-sky-100 text-sky-800 border-sky-200' },
  paid: { label: 'Réglé', cls: 'bg-emerald-100 text-emerald-800 border-emerald-200' },
};

function CountUp({ value, suffix = '' }: { value: number; suffix?: string }) {
  const [n, setN] = useState(0);
  useEffect(() => {
    let raf = 0; const start = performance.now(); const dur = 800;
    const step = (t: number) => {
      const p = Math.min(1, (t - start) / dur);
      setN(Math.round(value * (1 - Math.pow(1 - p, 3))));
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [value]);
  return <>{n.toLocaleString('fr-FR')}{suffix}</>;
}

const empty = { donorName: '', donorEmail: '', donorPhone: '', amount: '', reason: '', dueDate: '', note: '' };

export default function PromessesPage() {
  const [pledges, setPledges] = useState<Pledge[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [filter, setFilter] = useState<'all' | Pledge['status']>('all');
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ ...empty });
  const [editId, setEditId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  const reload = useCallback(async () => {
    try {
      const r = await fetch('/api/pledges');
      const d = await r.json();
      setPledges(Array.isArray(d) ? d : []);
    } catch { /* ignore */ } finally { setLoaded(true); }
  }, []);

  useEffect(() => { reload(); }, [reload]);

  const stats = useMemo(() => {
    let due = 0, collected = 0, total = 0;
    for (const p of pledges) {
      total += p.amount;
      collected += p.paid_amount;
      due += Math.max(0, p.amount - p.paid_amount);
    }
    return { due, collected, total, count: pledges.length };
  }, [pledges]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return pledges.filter((p) => {
      if (filter !== 'all' && p.status !== filter) return false;
      if (q && !(`${p.donor_name} ${p.reason ?? ''} ${p.donor_email ?? ''}`.toLowerCase().includes(q))) return false;
      return true;
    });
  }, [pledges, filter, search]);

  const openNew = () => { setForm({ ...empty }); setEditId(null); setErr(''); setShowForm(true); };
  const openEdit = (p: Pledge) => {
    setForm({
      donorName: p.donor_name, donorEmail: p.donor_email ?? '', donorPhone: p.donor_phone ?? '',
      amount: String(p.amount), reason: p.reason ?? '', dueDate: p.due_date ?? '', note: p.note ?? '',
    });
    setEditId(p.id); setErr(''); setShowForm(true);
  };

  const save = async () => {
    setErr('');
    if (!form.donorName.trim() || !(Number(form.amount) > 0)) { setErr('Nom et montant (> 0) requis.'); return; }
    setBusy(true);
    try {
      const payload = {
        ...(editId ? { id: editId } : {}),
        donorName: form.donorName.trim(), donorEmail: form.donorEmail, donorPhone: form.donorPhone,
        amount: Number(form.amount), reason: form.reason, dueDate: form.dueDate || null, note: form.note,
      };
      const r = await fetch('/api/pledges', { method: editId ? 'PATCH' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      if (!r.ok) { const d = await r.json().catch(() => ({})); setErr(d.error || 'Erreur'); return; }
      setShowForm(false);
      await reload();
    } finally { setBusy(false); }
  };

  const markPaid = async (p: Pledge) => {
    await fetch('/api/pledges', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: p.id, markPaid: true }) });
    await reload();
  };
  const addPayment = async (p: Pledge) => {
    const v = prompt(`Montant reçu pour ${p.donor_name} ? (déjà ${p.paid_amount} € sur ${p.amount} €)`, '');
    if (v === null) return;
    const add = Number(v.replace(',', '.'));
    if (!(add > 0)) return;
    await fetch('/api/pledges', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: p.id, paidAmount: Math.min(p.amount, p.paid_amount + add) }) });
    await reload();
  };
  const remove = async (p: Pledge) => {
    if (!confirm(`Supprimer la promesse de ${p.donor_name} ?`)) return;
    await fetch('/api/pledges', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: p.id }) });
    await reload();
  };

  const exportCsv = () => {
    const rows = [['Nom', 'Email', 'Téléphone', 'Montant', 'Payé', 'Reste', 'Statut', 'Motif', 'Échéance']];
    filtered.forEach((p) => rows.push([
      p.donor_name, p.donor_email ?? '', p.donor_phone ?? '', String(p.amount), String(p.paid_amount),
      String(Math.max(0, p.amount - p.paid_amount)), STATUS_META[p.status].label, p.reason ?? '', p.due_date ?? '',
    ]));
    const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = 'promesses.csv'; a.click();
  };

  const kpis = [
    { label: 'À régler', value: stats.due, from: '#D97706', to: '#B45309', icon: '⏳' },
    { label: 'Réglés', value: stats.collected, from: '#1E6F5C', to: '#2C8A72', icon: '✓' },
    { label: 'Total promesses', value: stats.total, from: '#C9A96E', to: '#9A7A3A', icon: '✦' },
  ];

  return (
    <div className="min-h-screen pt-24 pb-20">
      <div className="max-w-5xl mx-auto px-5 sm:px-6">
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs uppercase tracking-widest text-gold-600">Finance</p>
          <Link href="/dashboard" className="text-sm text-brown-500 hover:text-brown-800 transition-colors">← Dashboard</Link>
        </div>
        <div className="flex flex-wrap items-end justify-between gap-3 mb-8">
          <h1 className="text-4xl sm:text-5xl font-light text-brown-900" style={{ fontFamily: 'var(--font-cormorant)' }}>
            Promesses de <em className="gradient-text">dons</em>
          </h1>
          <button onClick={openNew} className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-brown-900 text-beige-50 text-sm font-medium hover:bg-brown-800 transition-colors">
            ➕ Nouvelle promesse
          </button>
        </div>

        {/* KPI colorés */}
        <div className="grid grid-cols-3 gap-3 mb-8">
          {kpis.map((k, i) => (
            <motion.div key={k.label} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}
              className="rounded-2xl p-4 sm:p-5 text-beige-50 shadow-lg" style={{ background: `linear-gradient(135deg, ${k.from}, ${k.to})` }}>
              <span className="text-lg opacity-90">{k.icon}</span>
              <p className="text-2xl sm:text-3xl font-semibold leading-none mt-3" style={{ fontFamily: 'var(--font-cormorant)' }}>
                <CountUp value={k.value} suffix=" €" />
              </p>
              <p className="text-[11px] opacity-80 mt-1.5">{k.label}</p>
            </motion.div>
          ))}
        </div>

        {/* Filtres + recherche */}
        <div className="flex flex-wrap items-center gap-2 mb-5">
          {([['all', `Toutes (${stats.count})`], ['pending', STATUS_META.pending.label], ['partial', STATUS_META.partial.label], ['paid', STATUS_META.paid.label]] as const).map(([k, label]) => (
            <button key={k} onClick={() => setFilter(k)}
              className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${filter === k ? 'bg-gold-400/20 border-gold-400/40 text-gold-700 font-medium' : 'bg-beige-50 border-beige-200 text-brown-500 hover:border-gold-400/30'}`}>
              {label}
            </button>
          ))}
          <div className="flex-1 min-w-[160px]" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="🔍 Rechercher…"
            className="px-3 py-1.5 rounded-xl bg-beige-50 border border-beige-200 text-sm text-brown-900 placeholder:text-brown-300 focus:outline-none focus:border-gold-400 transition-colors" />
          {filtered.length > 0 && (
            <button onClick={exportCsv} className="text-xs px-3 py-1.5 rounded-full bg-beige-100 border border-beige-200 text-brown-600 hover:border-gold-400/30 transition-colors">⬇ CSV</button>
          )}
        </div>

        {/* Liste */}
        {!loaded ? (
          <p className="text-brown-400 text-sm">Chargement…</p>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 rounded-2xl bg-beige-50 border border-beige-200">
            <p className="text-4xl text-gold-400 mb-3">✦</p>
            <p className="text-brown-500 text-sm">{pledges.length === 0 ? 'Aucune promesse pour l’instant.' : 'Aucun résultat.'}</p>
            {pledges.length === 0 && <button onClick={openNew} className="mt-4 text-sm text-gold-700 hover:underline">Ajouter la première →</button>}
          </div>
        ) : (
          <div className="space-y-2.5">
            {filtered.map((p, i) => {
              const reste = Math.max(0, p.amount - p.paid_amount);
              const pct = p.amount > 0 ? Math.min(100, Math.round((p.paid_amount / p.amount) * 100)) : 0;
              return (
                <motion.div key={p.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(i * 0.03, 0.3) }}
                  className="p-4 rounded-2xl bg-beige-50 border border-beige-200 hover:border-gold-400/30 transition-colors">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-medium text-brown-900">{p.donor_name}</p>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full border ${STATUS_META[p.status].cls}`}>{STATUS_META[p.status].label}</span>
                      </div>
                      <p className="text-xs text-brown-400 mt-0.5">
                        {[p.reason, p.due_date ? `échéance ${new Date(p.due_date).toLocaleDateString('fr-FR')}` : null, p.donor_phone].filter(Boolean).join(' · ') || '—'}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-semibold text-brown-900" style={{ fontFamily: 'var(--font-cormorant)' }}>{p.amount.toLocaleString('fr-FR')} €</p>
                      {p.status !== 'paid' && <p className="text-[11px] text-amber-700">reste {reste.toLocaleString('fr-FR')} €</p>}
                    </div>
                  </div>
                  {/* Barre de progression */}
                  <div className="mt-3 h-1.5 rounded-full bg-beige-200 overflow-hidden">
                    <div className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-emerald-600 transition-all" style={{ width: `${pct}%` }} />
                  </div>
                  <div className="flex flex-wrap gap-2 mt-3">
                    {p.status !== 'paid' && <button onClick={() => markPaid(p)} className="text-xs px-3 py-1.5 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 transition-colors">✓ Tout réglé</button>}
                    {p.status !== 'paid' && <button onClick={() => addPayment(p)} className="text-xs px-3 py-1.5 rounded-lg bg-beige-100 border border-beige-200 text-brown-600 hover:border-gold-400/30 transition-colors">+ Paiement partiel</button>}
                    <button onClick={() => openEdit(p)} className="text-xs px-3 py-1.5 rounded-lg bg-beige-100 border border-beige-200 text-brown-600 hover:border-gold-400/30 transition-colors">✎ Modifier</button>
                    <button onClick={() => remove(p)} className="text-xs px-3 py-1.5 rounded-lg text-brown-400 hover:text-red-500 hover:bg-red-50 transition-colors">Supprimer</button>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal ajout/édition */}
      <AnimatePresence>
        {showForm && (
          <>
            <motion.div className="fixed inset-0 z-[80] bg-brown-900/40 backdrop-blur-sm" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowForm(false)} />
            <motion.div className="fixed inset-x-4 top-[8vh] z-[90] mx-auto max-w-md rounded-3xl bg-beige-50 border border-beige-200 shadow-2xl p-6 max-h-[84vh] overflow-y-auto"
              initial={{ opacity: 0, y: 20, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 20, scale: 0.97 }}>
              <h2 className="text-2xl font-light text-brown-900 mb-4" style={{ fontFamily: 'var(--font-cormorant)' }}>
                {editId ? 'Modifier la promesse' : 'Nouvelle promesse'}
              </h2>
              <div className="space-y-3">
                {([
                  ['donorName', 'Nom du donateur *', 'text'],
                  ['amount', 'Montant promis (€) *', 'number'],
                  ['reason', 'Motif (Hazkara, événement…)', 'text'],
                  ['dueDate', 'Échéance souhaitée', 'date'],
                  ['donorEmail', 'Email', 'email'],
                  ['donorPhone', 'Téléphone', 'tel'],
                ] as const).map(([key, label, type]) => (
                  <div key={key}>
                    <label className="block text-xs text-brown-500 mb-1">{label}</label>
                    <input type={type} value={(form as Record<string, string>)[key]}
                      onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                      className="w-full px-3 py-2.5 rounded-xl bg-white border border-beige-200 text-sm text-brown-900 focus:outline-none focus:border-gold-400 transition-colors" />
                  </div>
                ))}
                <div>
                  <label className="block text-xs text-brown-500 mb-1">Note interne</label>
                  <textarea value={form.note} onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))} rows={2}
                    className="w-full px-3 py-2.5 rounded-xl bg-white border border-beige-200 text-sm text-brown-900 focus:outline-none focus:border-gold-400 transition-colors resize-none" />
                </div>
              </div>
              {err && <p className="text-xs text-red-500 mt-3">{err}</p>}
              <div className="flex gap-2 mt-5">
                <button onClick={() => setShowForm(false)} className="flex-1 py-2.5 rounded-xl border border-beige-200 text-brown-600 text-sm hover:bg-beige-100 transition-colors">Annuler</button>
                <button onClick={save} disabled={busy} className="flex-1 py-2.5 rounded-xl bg-brown-900 text-beige-50 text-sm font-medium hover:bg-brown-800 transition-colors disabled:opacity-50">
                  {busy ? '…' : editId ? 'Enregistrer' : 'Ajouter'}
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
