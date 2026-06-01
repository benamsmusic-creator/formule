'use client';
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';

const PRESETS = ['#C9A96E', '#1E6F5C', '#2563EB', '#7C3AED', '#DC2626', '#0EA5E9', '#D97706', '#BE185D'];

export default function ParametresPage() {
  const [name, setName] = useState('');
  const [color, setColor] = useState('#C9A96E');
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/org-settings').then((r) => r.json()).then((d) => {
      if (d?.name) setName(d.name);
      if (d?.accent_color) setColor(d.accent_color);
    }).finally(() => setLoaded(true));
  }, []);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true); setMsg(null);
    try {
      const res = await fetch('/api/org-settings', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, accentColor: color }),
      });
      if (!res.ok) throw new Error();
      setMsg('Réglages enregistrés ✓');
    } catch {
      setMsg('Erreur lors de l’enregistrement.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen pt-24 pb-20">
      <div className="max-w-xl mx-auto px-5 sm:px-6">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-4xl font-light text-brown-900" style={{ fontFamily: 'var(--font-cormorant)' }}>
            Réglages
          </h1>
          <Link href="/dashboard" className="text-sm text-brown-500 hover:text-brown-800 transition-colors">← Dashboard</Link>
        </div>

        {!loaded ? (
          <p className="text-brown-400 text-sm">Chargement…</p>
        ) : (
          <form onSubmit={save} className="rounded-2xl bg-beige-50 border border-beige-200 p-6 space-y-6">
            <div>
              <label className="text-xs text-brown-500 uppercase tracking-wide font-medium">Nom de la communauté</label>
              <input
                className="mt-1 w-full px-3.5 py-2.5 rounded-xl bg-beige-100 border border-beige-200 text-brown-900 text-sm focus:outline-none focus:border-gold-400 transition-colors"
                value={name} onChange={(e) => setName(e.target.value)} />
            </div>

            <div>
              <label className="text-xs text-brown-500 uppercase tracking-wide font-medium">Couleur d’accent</label>
              <p className="text-[11px] text-brown-400 mb-3">Utilisée sur votre site public et vos formulaires.</p>
              <div className="flex flex-wrap items-center gap-2">
                {PRESETS.map((c) => (
                  <button key={c} type="button" onClick={() => setColor(c)}
                    className={`w-9 h-9 rounded-full border-2 transition-transform ${color.toLowerCase() === c.toLowerCase() ? 'border-brown-900 scale-110' : 'border-transparent'}`}
                    style={{ background: c }} aria-label={`Couleur ${c}`} />
                ))}
                <label className="ml-1 inline-flex items-center gap-2 text-xs text-brown-500 cursor-pointer">
                  <input type="color" value={color} onChange={(e) => setColor(e.target.value)} className="w-9 h-9 rounded-full cursor-pointer border border-beige-200" />
                  Personnalisée
                </label>
              </div>
            </div>

            {/* Aperçu */}
            <div className="rounded-xl border border-beige-200 p-4 flex items-center gap-3">
              <span className="text-xs text-brown-400">Aperçu :</span>
              <span className="px-4 py-2 rounded-lg text-beige-50 text-sm font-medium" style={{ background: color }}>Bouton</span>
              <span className="px-3 py-1 rounded-full text-xs font-medium" style={{ background: `${color}1a`, color, border: `1px solid ${color}40` }}>Étiquette</span>
            </div>

            {msg && <p className="text-sm text-green-600">{msg}</p>}

            <motion.button type="submit" disabled={saving}
              className="px-6 py-2.5 rounded-xl bg-brown-900 text-beige-50 text-sm font-medium disabled:opacity-40"
              whileTap={{ scale: 0.98 }}>
              {saving ? 'Enregistrement…' : 'Enregistrer'}
            </motion.button>
          </form>
        )}
      </div>
    </div>
  );
}
