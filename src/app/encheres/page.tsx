'use client';
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';

type Item = { id: string; title: string; current_bid: number; current_bidder: string; closed: boolean };

export default function EncheresPage() {
  const [list, setList] = useState<Item[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [title, setTitle] = useState('');
  const [saving, setSaving] = useState(false);

  const load = () => { fetch('/api/auction').then((r) => r.json()).then((d) => { if (Array.isArray(d)) setList(d); }).finally(() => setLoaded(true)); };
  useEffect(load, []);

  const add = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true);
    try {
      const res = await fetch('/api/auction', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ title }) });
      if (res.ok) { setTitle(''); load(); }
    } finally { setSaving(false); }
  };
  const remove = async (id: string) => {
    await fetch('/api/auction', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) });
    setList((l) => l.filter((x) => x.id !== id));
  };

  const input = 'w-full px-3.5 py-2.5 rounded-xl bg-beige-100 border border-beige-200 text-brown-900 text-sm focus:outline-none focus:border-gold-400 transition-colors';

  return (
    <div className="min-h-screen pt-24 pb-20">
      <div className="max-w-xl mx-auto px-5 sm:px-6">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-4xl font-light text-brown-900" style={{ fontFamily: 'var(--font-cormorant)' }}>Enchères de mitzvot</h1>
          <Link href="/dashboard" className="text-sm text-brown-500 hover:text-brown-800 transition-colors">← Dashboard</Link>
        </div>
        <p className="text-sm text-brown-500 mb-6">Créez les honneurs à enchérir. Les membres enchérissent depuis votre site public.</p>

        <form onSubmit={add} className="rounded-2xl bg-beige-50 border border-beige-200 p-6 flex gap-2 mb-8">
          <input className={input} placeholder="Ex : Ouverture du Aron, Maftir Yona…" value={title} onChange={(e) => setTitle(e.target.value)} />
          <motion.button type="submit" disabled={saving || !title}
            className="px-5 py-2.5 rounded-xl bg-brown-900 text-beige-50 text-sm font-medium disabled:opacity-40 whitespace-nowrap" whileTap={{ scale: 0.98 }}>
            + Ajouter
          </motion.button>
        </form>

        {!loaded ? <p className="text-brown-400 text-sm">Chargement…</p> : list.length === 0 ? (
          <p className="text-brown-400 text-sm text-center py-8">Aucune enchère.</p>
        ) : (
          <div className="space-y-2">
            {list.map((x) => (
              <div key={x.id} className="flex items-center justify-between gap-3 p-4 rounded-2xl bg-beige-50 border border-beige-200">
                <div className="min-w-0">
                  <p className="font-medium text-brown-900">{x.title}</p>
                  <p className="text-xs text-brown-400">{x.current_bid > 0 ? `Meilleure offre : ${x.current_bid} € — ${x.current_bidder}` : 'Aucune offre'}</p>
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
