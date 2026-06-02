'use client';
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { SkeletonRows } from '@/components/Skeleton';

type A ={ id: string; kind: string; title: string; body: string };
const KINDS = [
  { v: 'info', label: 'Information' },
  { v: 'mazaltov', label: 'Mazal Tov 🎉' },
  { v: 'urgent', label: 'Urgent ⚠️' },
];

export default function AnnoncesPage() {
  const [list, setList] = useState<A[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [form, setForm] = useState({ kind: 'info', title: '', body: '' });
  const [saving, setSaving] = useState(false);

  const load = () => { fetch('/api/announcements').then((r) => r.json()).then((d) => { if (Array.isArray(d)) setList(d); }).finally(() => setLoaded(true)); };
  useEffect(load, []);

  const add = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true);
    try {
      const res = await fetch('/api/announcements', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
      if (res.ok) { setForm({ kind: form.kind, title: '', body: '' }); load(); }
    } finally { setSaving(false); }
  };
  const remove = async (id: string) => {
    await fetch('/api/announcements', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) });
    setList((l) => l.filter((x) => x.id !== id));
  };

  const input = 'w-full px-3.5 py-2.5 rounded-xl bg-beige-100 border border-beige-200 text-brown-900 text-sm focus:outline-none focus:border-gold-400 transition-colors';

  return (
    <div className="min-h-screen pt-24 pb-20">
      <div className="max-w-xl mx-auto px-5 sm:px-6">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-4xl font-light text-brown-900" style={{ fontFamily: 'var(--font-cormorant)' }}>Annonces</h1>
          <Link href="/dashboard" className="text-sm text-brown-500 hover:text-brown-800 transition-colors">← Dashboard</Link>
        </div>

        <form onSubmit={add} className="rounded-2xl bg-beige-50 border border-beige-200 p-6 space-y-3 mb-8">
          <select className={input} value={form.kind} onChange={(e) => setForm({ ...form, kind: e.target.value })}>
            {KINDS.map((k) => <option key={k.v} value={k.v}>{k.label}</option>)}
          </select>
          <input className={input} placeholder="Titre" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          <textarea className={`${input} resize-none`} rows={3} placeholder="Texte (facultatif)" value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} />
          <motion.button type="submit" disabled={saving || !form.title}
            className="px-6 py-2.5 rounded-xl bg-brown-900 text-beige-50 text-sm font-medium disabled:opacity-40" whileTap={{ scale: 0.98 }}>
            {saving ? 'Publication…' : 'Publier'}
          </motion.button>
        </form>

        {!loaded ? <SkeletonRows count={5} /> : list.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <motion.div className="text-5xl mb-4" animate={{ y: [0, -6, 0] }} transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}>📣</motion.div>
            <h2 className="text-2xl font-light text-brown-700 mb-1" style={{ fontFamily: 'var(--font-cormorant)' }}>Aucune annonce</h2>
            <p className="text-brown-400 text-sm max-w-xs mx-auto">Publiez votre première annonce à l’aide du formulaire ci-dessus.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {list.map((a) => (
              <div key={a.id} className="flex items-start justify-between gap-3 p-4 rounded-2xl bg-beige-50 border border-beige-200">
                <div className="min-w-0">
                  <p className="font-medium text-brown-900">{a.kind === 'mazaltov' ? '🎉 ' : a.kind === 'urgent' ? '⚠️ ' : ''}{a.title}</p>
                  {a.body && <p className="text-xs text-brown-500 mt-0.5">{a.body}</p>}
                </div>
                <button onClick={() => remove(a.id)} className="text-xs text-brown-400 hover:text-red-500 transition-colors flex-shrink-0">Supprimer</button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
