'use client';
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';

type M = { id: string; name: string; email: string; phone: string; paid_until: string | null };

function isUpToDate(paidUntil: string | null): boolean {
  if (!paidUntil) return false;
  return new Date(paidUntil) >= new Date(new Date().toDateString());
}

export default function MembresPage() {
  const [list, setList] = useState<M[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', phone: '', paidUntil: '' });
  const [saving, setSaving] = useState(false);

  const load = () => { fetch('/api/members').then((r) => r.json()).then((d) => { if (Array.isArray(d)) setList(d); }).finally(() => setLoaded(true)); };
  useEffect(load, []);

  const add = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true);
    try {
      const res = await fetch('/api/members', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
      if (res.ok) { setForm({ name: '', email: '', phone: '', paidUntil: '' }); load(); }
    } finally { setSaving(false); }
  };
  const renew = async (id: string) => {
    const d = new Date(); d.setFullYear(d.getFullYear() + 1);
    const paidUntil = d.toISOString().slice(0, 10);
    await fetch('/api/members', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, paidUntil }) });
    setList((l) => l.map((m) => m.id === id ? { ...m, paid_until: paidUntil } : m));
  };
  const remove = async (id: string) => {
    await fetch('/api/members', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) });
    setList((l) => l.filter((m) => m.id !== id));
  };

  const upToDate = list.filter((m) => isUpToDate(m.paid_until)).length;
  const input = 'w-full px-3.5 py-2.5 rounded-xl bg-beige-100 border border-beige-200 text-brown-900 text-sm focus:outline-none focus:border-gold-400 transition-colors';

  return (
    <div className="min-h-screen pt-24 pb-20">
      <div className="max-w-2xl mx-auto px-5 sm:px-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-4xl font-light text-brown-900" style={{ fontFamily: 'var(--font-cormorant)' }}>Adhésions</h1>
          <Link href="/dashboard" className="text-sm text-brown-500 hover:text-brown-800 transition-colors">← Dashboard</Link>
        </div>
        {loaded && (
          <p className="text-sm text-brown-500 mb-6">
            <span className="font-semibold text-green-600">{upToDate}</span> à jour · <span className="font-semibold text-red-500">{list.length - upToDate}</span> en retard / sans cotisation
          </p>
        )}

        <form onSubmit={add} className="rounded-2xl bg-beige-50 border border-beige-200 p-6 mb-8 grid sm:grid-cols-2 gap-3">
          <input className={input} placeholder="Nom" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <input className={input} type="email" placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          <input className={input} placeholder="Téléphone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          <div>
            <label className="text-[11px] text-brown-400">Cotisation valable jusqu’au</label>
            <input type="date" className={input} value={form.paidUntil} onChange={(e) => setForm({ ...form, paidUntil: e.target.value })} />
          </div>
          <motion.button type="submit" disabled={saving || !form.name}
            className="sm:col-span-2 px-6 py-2.5 rounded-xl bg-brown-900 text-beige-50 text-sm font-medium disabled:opacity-40" whileTap={{ scale: 0.98 }}>
            {saving ? 'Ajout…' : '+ Ajouter un membre'}
          </motion.button>
        </form>

        {!loaded ? <p className="text-brown-400 text-sm">Chargement…</p> : list.length === 0 ? (
          <p className="text-brown-400 text-sm text-center py-8">Aucun membre.</p>
        ) : (
          <div className="space-y-2">
            {list.map((m) => {
              const ok = isUpToDate(m.paid_until);
              return (
                <div key={m.id} className="flex items-center justify-between gap-3 p-4 rounded-2xl bg-beige-50 border border-beige-200">
                  <div className="min-w-0">
                    <p className="font-medium text-brown-900">{m.name}
                      <span className={`ml-2 text-xs px-2 py-0.5 rounded-full ${ok ? 'bg-green-100 text-green-700' : 'bg-red-50 text-red-600'}`}>
                        {ok ? 'À jour' : 'En retard'}
                      </span>
                    </p>
                    <p className="text-xs text-brown-400 truncate">{[m.email, m.phone].filter(Boolean).join(' · ')}{m.paid_until ? ` · jusqu'au ${m.paid_until}` : ''}</p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button onClick={() => renew(m.id)} className="text-xs font-medium text-gold-700 border border-gold-400/30 px-3 py-1.5 rounded-lg hover:bg-gold-400/10 transition-colors">+1 an</button>
                    <button onClick={() => remove(m.id)} className="text-xs text-brown-400 hover:text-red-500 transition-colors">×</button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
