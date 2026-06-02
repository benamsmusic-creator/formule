'use client';
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { SkeletonRows } from '@/components/Skeleton';

type Y ={ id: string; name: string; hebLabel: string; contact_email: string | null };

export default function YahrzeitPage() {
  const [list, setList] = useState<Y[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [form, setForm] = useState({ name: '', gregDeath: '', contactEmail: '' });
  const [saving, setSaving] = useState(false);

  const load = () => { fetch('/api/yahrzeit').then((r) => r.json()).then((d) => { if (Array.isArray(d)) setList(d); }).finally(() => setLoaded(true)); };
  useEffect(load, []);

  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch('/api/yahrzeit', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
      if (res.ok) { setForm({ name: '', gregDeath: '', contactEmail: '' }); load(); }
    } finally { setSaving(false); }
  };

  const remove = async (id: string) => {
    await fetch('/api/yahrzeit', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) });
    setList((l) => l.filter((x) => x.id !== id));
  };

  const input = 'w-full px-3.5 py-2.5 rounded-xl bg-beige-100 border border-beige-200 text-brown-900 text-sm focus:outline-none focus:border-gold-400 transition-colors';

  return (
    <div className="min-h-screen pt-24 pb-20">
      <div className="max-w-xl mx-auto px-5 sm:px-6">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-4xl font-light text-brown-900" style={{ fontFamily: 'var(--font-cormorant)' }}>Yahrzeit 🕯️</h1>
          <Link href="/dashboard" className="text-sm text-brown-500 hover:text-brown-800 transition-colors">← Dashboard</Link>
        </div>
        <p className="text-sm text-brown-500 mb-6">Un rappel email est envoyé automatiquement le jour de la Yahrzeit (et 7 jours avant) à l’adresse indiquée.</p>

        <form onSubmit={add} className="rounded-2xl bg-beige-50 border border-beige-200 p-6 space-y-3 mb-8">
          <input className={input} placeholder="Nom du défunt" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <div>
            <label className="text-xs text-brown-400">Date du décès (calendrier civil)</label>
            <input type="date" className={`${input} mt-1`} value={form.gregDeath} onChange={(e) => setForm({ ...form, gregDeath: e.target.value })} />
          </div>
          <input className={input} type="email" placeholder="Email de rappel (famille)" value={form.contactEmail} onChange={(e) => setForm({ ...form, contactEmail: e.target.value })} />
          <motion.button type="submit" disabled={saving || !form.name || !form.gregDeath}
            className="px-6 py-2.5 rounded-xl bg-brown-900 text-beige-50 text-sm font-medium disabled:opacity-40" whileTap={{ scale: 0.98 }}>
            {saving ? 'Ajout…' : '+ Ajouter'}
          </motion.button>
        </form>

        {!loaded ? <SkeletonRows count={5} /> : list.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <motion.div className="text-5xl mb-4" animate={{ y: [0, -6, 0] }} transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}>🕯️</motion.div>
            <h2 className="text-2xl font-light text-brown-700 mb-1" style={{ fontFamily: 'var(--font-cormorant)' }}>Aucune Yahrzeit enregistrée</h2>
            <p className="text-brown-400 text-sm max-w-xs mx-auto">Ajoutez un défunt à l’aide du formulaire ci-dessus pour recevoir les rappels.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {list.map((y) => (
              <div key={y.id} className="flex items-center justify-between gap-3 p-4 rounded-2xl bg-beige-50 border border-beige-200">
                <div>
                  <p className="font-medium text-brown-900">{y.name}</p>
                  <p className="text-xs text-brown-400">{y.hebLabel}{y.contact_email ? ` · ${y.contact_email}` : ''}</p>
                </div>
                <button onClick={() => remove(y.id)} className="text-xs text-brown-400 hover:text-red-500 transition-colors">Supprimer</button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
