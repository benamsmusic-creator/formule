'use client';
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { SkeletonRows } from '@/components/Skeleton';

type Entry ={ id: string; category: string; name: string; address: string; phone: string; url: string };
const CATEGORIES = ['Restaurant cacher', 'Boucherie', 'Boulangerie', 'Mikvé', 'École', 'Synagogue', 'Épicerie', 'Autre'];

export default function AnnuaireAdminPage() {
  const [list, setList] = useState<Entry[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [form, setForm] = useState({ category: CATEGORIES[0], name: '', address: '', phone: '', url: '' });
  const [saving, setSaving] = useState(false);

  const load = () => { fetch('/api/directory').then((r) => r.json()).then((d) => { if (Array.isArray(d)) setList(d); }).finally(() => setLoaded(true)); };
  useEffect(load, []);

  const add = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true);
    try {
      const res = await fetch('/api/directory', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
      if (res.ok) { setForm({ category: form.category, name: '', address: '', phone: '', url: '' }); load(); }
    } finally { setSaving(false); }
  };
  const remove = async (id: string) => {
    await fetch('/api/directory', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) });
    setList((l) => l.filter((x) => x.id !== id));
  };

  const input = 'w-full px-3.5 py-2.5 rounded-xl bg-beige-100 border border-beige-200 text-brown-900 text-sm focus:outline-none focus:border-gold-400 transition-colors';

  return (
    <div className="min-h-screen pt-24 pb-20">
      <div className="max-w-2xl mx-auto px-5 sm:px-6">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-4xl font-light text-brown-900" style={{ fontFamily: 'var(--font-cormorant)' }}>Annuaire</h1>
          <Link href="/dashboard" className="text-sm text-brown-500 hover:text-brown-800 transition-colors">← Dashboard</Link>
        </div>
        <p className="text-sm text-brown-500 mb-6">Ajoutez les commerces et services de votre communauté. Ils s’afficheront sur votre site public.</p>

        <form onSubmit={add} className="rounded-2xl bg-beige-50 border border-beige-200 p-6 space-y-3 mb-8">
          <div className="grid sm:grid-cols-2 gap-3">
            <select className={input} value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
              {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
            <input className={input} placeholder="Nom" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            <input className={input} placeholder="Adresse" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
            <input className={input} placeholder="Téléphone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            <input className={`${input} sm:col-span-2`} placeholder="Site web (optionnel)" value={form.url} onChange={(e) => setForm({ ...form, url: e.target.value })} />
          </div>
          <motion.button type="submit" disabled={saving || !form.name}
            className="px-6 py-2.5 rounded-xl bg-brown-900 text-beige-50 text-sm font-medium disabled:opacity-40" whileTap={{ scale: 0.98 }}>
            {saving ? 'Ajout…' : '+ Ajouter'}
          </motion.button>
        </form>

        {!loaded ? <SkeletonRows count={5} /> : list.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <motion.div className="text-5xl mb-4" animate={{ y: [0, -6, 0] }} transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}>📒</motion.div>
            <h2 className="text-2xl font-light text-brown-700 mb-1" style={{ fontFamily: 'var(--font-cormorant)' }}>Annuaire vide</h2>
            <p className="text-brown-400 text-sm max-w-xs mx-auto">Ajoutez les commerces et services de votre communauté à l’aide du formulaire ci-dessus.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {list.map((x) => (
              <div key={x.id} className="flex items-center justify-between gap-3 p-4 rounded-2xl bg-beige-50 border border-beige-200">
                <div className="min-w-0">
                  <p className="font-medium text-brown-900">{x.name} <span className="text-xs text-gold-600">· {x.category}</span></p>
                  <p className="text-xs text-brown-400 truncate">{[x.address, x.phone].filter(Boolean).join(' · ')}</p>
                </div>
                <button onClick={() => remove(x.id)} className="text-xs text-brown-400 hover:text-red-500 transition-colors flex-shrink-0">Supprimer</button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
