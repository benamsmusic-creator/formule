'use client';
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { SkeletonRows } from '@/components/Skeleton';

type Client ={ id: string; name: string; created_at: string; admins: { email: string; name: string }[] };

export default function ClientsPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [form, setForm] = useState({ orgId: '', orgName: '', adminEmail: '', adminPassword: '', adminName: '' });
  const [msg, setMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);
  const [saving, setSaving] = useState(false);

  const load = () => {
    fetch('/api/clients')
      .then((r) => r.json())
      .then((d) => { if (Array.isArray(d)) setClients(d); })
      .finally(() => setLoaded(true));
  };
  useEffect(load, []);

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true); setMsg(null);
    try {
      const res = await fetch('/api/clients', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error ?? 'Erreur');
      setMsg({ type: 'ok', text: `Client « ${form.orgName} » créé. L'admin peut se connecter avec son email.` });
      setForm({ orgId: '', orgName: '', adminEmail: '', adminPassword: '', adminName: '' });
      load();
    } catch (err) {
      setMsg({ type: 'err', text: err instanceof Error ? err.message : 'Erreur' });
    } finally {
      setSaving(false);
    }
  };

  const input = 'w-full px-3.5 py-2.5 rounded-xl bg-beige-100 border border-beige-200 text-brown-900 text-sm focus:outline-none focus:border-gold-400 transition-colors';

  return (
    <div className="min-h-screen pt-24 pb-20">
      <div className="max-w-3xl mx-auto px-5 sm:px-6">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-4xl font-light text-brown-900" style={{ fontFamily: 'var(--font-cormorant)' }}>
            Mes <em className="gradient-text not-italic">clients</em>
          </h1>
          <Link href="/dashboard" className="text-sm text-brown-500 hover:text-brown-800 transition-colors">← Dashboard</Link>
        </div>

        {/* Créer un client */}
        <form onSubmit={create} className="rounded-2xl bg-beige-50 border border-beige-200 p-6 mb-8 space-y-3">
          <h2 className="text-lg font-medium text-brown-900 mb-1" style={{ fontFamily: 'var(--font-cormorant)' }}>Nouveau client</h2>
          <div className="grid sm:grid-cols-2 gap-3">
            <input className={input} placeholder="Identifiant (ex: beth-chalom)" value={form.orgId} onChange={(e) => setForm({ ...form, orgId: e.target.value })} />
            <input className={input} placeholder="Nom de la communauté" value={form.orgName} onChange={(e) => setForm({ ...form, orgName: e.target.value })} />
            <input className={input} type="email" placeholder="Email de l'admin" value={form.adminEmail} onChange={(e) => setForm({ ...form, adminEmail: e.target.value })} />
            <input className={input} placeholder="Nom de l'admin (optionnel)" value={form.adminName} onChange={(e) => setForm({ ...form, adminName: e.target.value })} />
            <input className={input} type="text" placeholder="Mot de passe admin (min. 6)" value={form.adminPassword} onChange={(e) => setForm({ ...form, adminPassword: e.target.value })} />
          </div>
          {msg && (
            <p className={`text-xs ${msg.type === 'ok' ? 'text-green-600' : 'text-red-500'}`}>{msg.text}</p>
          )}
          <motion.button type="submit" disabled={saving}
            className="px-6 py-2.5 rounded-xl bg-brown-900 text-beige-50 text-sm font-medium disabled:opacity-40"
            whileTap={{ scale: 0.98 }}>
            {saving ? 'Création…' : '+ Créer le client'}
          </motion.button>
        </form>

        {/* Liste */}
        {!loaded ? (
          <SkeletonRows count={5} />
        ) : clients.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <motion.div className="text-5xl mb-4" animate={{ y: [0, -6, 0] }} transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}>🏛️</motion.div>
            <h2 className="text-2xl font-light text-brown-700 mb-1" style={{ fontFamily: 'var(--font-cormorant)' }}>Aucun client pour le moment</h2>
            <p className="text-brown-400 text-sm max-w-xs mx-auto">Créez votre premier client à l’aide du formulaire ci-dessus.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {clients.map((c) => (
              <div key={c.id} className="rounded-2xl bg-beige-50 border border-beige-200 p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-brown-900">{c.name}</p>
                    <p className="text-xs text-brown-400">/{c.id}</p>
                  </div>
                  <span className="text-xs text-brown-500">{c.admins.length} admin(s)</span>
                </div>
                {c.admins.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {c.admins.map((a) => (
                      <span key={a.email} className="text-xs bg-beige-100 border border-beige-200 px-2.5 py-1 rounded-full text-brown-600">{a.email}</span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
