'use client';
import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';

interface Campaign {
  id: string; slug: string; title: string; description: string | null;
  goal_amount: number; raised: number; status: string; cover_url: string | null;
}

const empty = { title: '', description: '', goalAmount: '', coverUrl: '' };

export default function CagnottesPage() {
  const [list, setList] = useState<Campaign[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ ...empty });
  const [editId, setEditId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [copied, setCopied] = useState<string | null>(null);

  const reload = useCallback(async () => {
    try {
      const r = await fetch('/api/campaigns');
      const d = await r.json();
      setList(Array.isArray(d) ? d : []);
    } catch { /* ignore */ } finally { setLoaded(true); }
  }, []);
  useEffect(() => { reload(); }, [reload]);

  const openNew = () => { setForm({ ...empty }); setEditId(null); setErr(''); setShowForm(true); };
  const openEdit = (c: Campaign) => {
    setForm({ title: c.title, description: c.description ?? '', goalAmount: String(c.goal_amount), coverUrl: c.cover_url ?? '' });
    setEditId(c.id); setErr(''); setShowForm(true);
  };

  const save = async () => {
    setErr('');
    if (!form.title.trim()) { setErr('Titre requis.'); return; }
    setBusy(true);
    try {
      const payload = {
        ...(editId ? { id: editId } : {}),
        title: form.title.trim(), description: form.description, goalAmount: Number(form.goalAmount) || 0, coverUrl: form.coverUrl,
      };
      const r = await fetch('/api/campaigns', { method: editId ? 'PATCH' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      if (!r.ok) { const d = await r.json().catch(() => ({})); setErr(d.error || 'Erreur'); return; }
      setShowForm(false); await reload();
    } finally { setBusy(false); }
  };

  const toggleStatus = async (c: Campaign) => {
    await fetch('/api/campaigns', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: c.id, status: c.status === 'active' ? 'closed' : 'active' }) });
    reload();
  };
  const addOffline = async (c: Campaign) => {
    const v = prompt(`Ajouter un don hors-ligne (espèces/chèque) à « ${c.title} » :`, '');
    if (v === null) return;
    const amt = Number(v.replace(',', '.'));
    if (!(amt > 0)) return;
    const who = prompt('Nom du donateur (facultatif) :', '') || '';
    await fetch('/api/campaigns', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: c.id, addOffline: amt, offlineName: who }) });
    reload();
  };
  const remove = async (c: Campaign) => {
    if (!confirm(`Supprimer « ${c.title} » et tous ses dons ?`)) return;
    await fetch('/api/campaigns', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: c.id }) });
    reload();
  };
  const copyLink = (c: Campaign) => {
    const url = `${window.location.origin}/cagnotte/${c.slug}`;
    navigator.clipboard?.writeText(url);
    setCopied(c.id); setTimeout(() => setCopied(null), 2000);
  };

  return (
    <div className="min-h-screen pt-24 pb-20">
      <div className="max-w-4xl mx-auto px-5 sm:px-6">
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs uppercase tracking-widest text-gold-600">Dons</p>
          <Link href="/dashboard" className="text-sm text-brown-500 hover:text-brown-800 transition-colors">← Dashboard</Link>
        </div>
        <div className="flex flex-wrap items-end justify-between gap-3 mb-8">
          <h1 className="text-4xl sm:text-5xl font-light text-brown-900" style={{ fontFamily: 'var(--font-cormorant)' }}>
            Cag<em className="gradient-text">nottes</em>
          </h1>
          <button onClick={openNew} className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-brown-900 text-beige-50 text-sm font-medium hover:bg-brown-800 transition-colors">
            ➕ Nouvelle cagnotte
          </button>
        </div>

        {!loaded ? (
          <p className="text-brown-400 text-sm">Chargement…</p>
        ) : list.length === 0 ? (
          <div className="text-center py-16 rounded-2xl bg-beige-50 border border-beige-200">
            <p className="text-4xl text-gold-400 mb-3">🎯</p>
            <p className="text-brown-500 text-sm">Aucune cagnotte. Lancez votre première collecte !</p>
            <button onClick={openNew} className="mt-4 text-sm text-gold-700 hover:underline">Créer une cagnotte →</button>
          </div>
        ) : (
          <div className="space-y-3">
            {list.map((c, i) => {
              const pct = c.goal_amount > 0 ? Math.min(100, Math.round((c.raised / c.goal_amount) * 100)) : 0;
              return (
                <motion.div key={c.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(i * 0.04, 0.3) }}
                  className="p-4 sm:p-5 rounded-2xl bg-beige-50 border border-beige-200">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-medium text-brown-900">{c.title}</p>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full border ${c.status === 'active' ? 'bg-emerald-100 text-emerald-800 border-emerald-200' : 'bg-beige-200 text-brown-500 border-beige-300'}`}>
                          {c.status === 'active' ? 'En cours' : 'Clôturée'}
                        </span>
                      </div>
                      <p className="text-xs text-brown-400 mt-0.5">/cagnotte/{c.slug}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-lg font-semibold text-brown-900" style={{ fontFamily: 'var(--font-cormorant)' }}>{c.raised.toLocaleString('fr-FR')} €</p>
                      {c.goal_amount > 0 && <p className="text-[11px] text-brown-400">/ {c.goal_amount.toLocaleString('fr-FR')} € · {pct}%</p>}
                    </div>
                  </div>
                  {c.goal_amount > 0 && (
                    <div className="mt-3 h-2 rounded-full bg-beige-200 overflow-hidden">
                      <div className="h-full rounded-full bg-gradient-to-r from-gold-400 to-gold-600 transition-all" style={{ width: `${pct}%` }} />
                    </div>
                  )}
                  <div className="flex flex-wrap gap-2 mt-3">
                    <a href={`/cagnotte/${c.slug}`} target="_blank" rel="noopener noreferrer" className="text-xs px-3 py-1.5 rounded-lg bg-beige-100 border border-beige-200 text-brown-600 hover:border-gold-400/30 transition-colors">👁 Voir</a>
                    <button onClick={() => copyLink(c)} className="text-xs px-3 py-1.5 rounded-lg bg-beige-100 border border-beige-200 text-brown-600 hover:border-gold-400/30 transition-colors">{copied === c.id ? '✓ Copié' : '🔗 Lien'}</button>
                    <button onClick={() => addOffline(c)} className="text-xs px-3 py-1.5 rounded-lg bg-beige-100 border border-beige-200 text-brown-600 hover:border-gold-400/30 transition-colors">+ Don hors-ligne</button>
                    <button onClick={() => openEdit(c)} className="text-xs px-3 py-1.5 rounded-lg bg-beige-100 border border-beige-200 text-brown-600 hover:border-gold-400/30 transition-colors">✎ Modifier</button>
                    <button onClick={() => toggleStatus(c)} className="text-xs px-3 py-1.5 rounded-lg bg-beige-100 border border-beige-200 text-brown-600 hover:border-gold-400/30 transition-colors">{c.status === 'active' ? '⏸ Clôturer' : '▶ Rouvrir'}</button>
                    <button onClick={() => remove(c)} className="text-xs px-3 py-1.5 rounded-lg text-brown-400 hover:text-red-500 hover:bg-red-50 transition-colors">Supprimer</button>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      <AnimatePresence>
        {showForm && (
          <>
            <motion.div className="fixed inset-0 z-[80] bg-brown-900/40 backdrop-blur-sm" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowForm(false)} />
            <motion.div className="fixed inset-x-4 top-[8vh] z-[90] mx-auto max-w-md rounded-3xl bg-beige-50 border border-beige-200 shadow-2xl p-6 max-h-[84vh] overflow-y-auto"
              initial={{ opacity: 0, y: 20, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 20, scale: 0.97 }}>
              <h2 className="text-2xl font-light text-brown-900 mb-4" style={{ fontFamily: 'var(--font-cormorant)' }}>{editId ? 'Modifier la cagnotte' : 'Nouvelle cagnotte'}</h2>
              <div className="space-y-3">
                <div>
                  <label className="block text-xs text-brown-500 mb-1">Titre *</label>
                  <input value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                    className="w-full px-3 py-2.5 rounded-xl bg-white border border-beige-200 text-sm text-brown-900 focus:outline-none focus:border-gold-400 transition-colors" />
                </div>
                <div>
                  <label className="block text-xs text-brown-500 mb-1">Objectif (€)</label>
                  <input type="number" value={form.goalAmount} onChange={(e) => setForm((f) => ({ ...f, goalAmount: e.target.value }))} placeholder="0 = pas d'objectif"
                    className="w-full px-3 py-2.5 rounded-xl bg-white border border-beige-200 text-sm text-brown-900 focus:outline-none focus:border-gold-400 transition-colors" />
                </div>
                <div>
                  <label className="block text-xs text-brown-500 mb-1">Image de couverture (URL)</label>
                  <input value={form.coverUrl} onChange={(e) => setForm((f) => ({ ...f, coverUrl: e.target.value }))} placeholder="https://…"
                    className="w-full px-3 py-2.5 rounded-xl bg-white border border-beige-200 text-sm text-brown-900 focus:outline-none focus:border-gold-400 transition-colors" />
                </div>
                <div>
                  <label className="block text-xs text-brown-500 mb-1">Description / histoire</label>
                  <textarea value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} rows={4}
                    className="w-full px-3 py-2.5 rounded-xl bg-white border border-beige-200 text-sm text-brown-900 focus:outline-none focus:border-gold-400 transition-colors resize-none" />
                </div>
              </div>
              {err && <p className="text-xs text-red-500 mt-3">{err}</p>}
              <div className="flex gap-2 mt-5">
                <button onClick={() => setShowForm(false)} className="flex-1 py-2.5 rounded-xl border border-beige-200 text-brown-600 text-sm hover:bg-beige-100 transition-colors">Annuler</button>
                <button onClick={save} disabled={busy} className="flex-1 py-2.5 rounded-xl bg-brown-900 text-beige-50 text-sm font-medium hover:bg-brown-800 transition-colors disabled:opacity-50">
                  {busy ? '…' : editId ? 'Enregistrer' : 'Créer'}
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
