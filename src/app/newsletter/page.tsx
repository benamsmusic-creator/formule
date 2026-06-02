'use client';
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';

export default function NewsletterPage() {
  const [count, setCount] = useState<number | null>(null);
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [msg, setMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);
  const [importing, setImporting] = useState(false);

  const handleImport = async (file: File) => {
    setImporting(true); setMsg(null);
    try {
      const text = await file.text();
      // Extrait toutes les adresses e-mail du fichier (CSV, une par ligne, ou colonnes)
      const emails = Array.from(text.matchAll(/[^\s,;"']+@[^\s,;"']+\.[^\s,;"']+/g)).map((m) => m[0]);
      if (emails.length === 0) throw new Error('Aucune adresse e-mail trouvée dans le fichier.');
      const res = await fetch('/api/newsletter', {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ emails }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error ?? 'Erreur');
      setMsg({ type: 'ok', text: `${d.imported} contact(s) importé(s) ✓` });
      fetch('/api/newsletter').then((r) => r.json()).then((x) => setCount(x.count ?? 0)).catch(() => {});
    } catch (err) {
      setMsg({ type: 'err', text: err instanceof Error ? err.message : 'Erreur' });
    } finally {
      setImporting(false);
    }
  };

  useEffect(() => {
    fetch('/api/newsletter').then((r) => r.json()).then((d) => setCount(d.count ?? 0)).catch(() => setCount(0));
  }, []);

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    setSending(true); setMsg(null);
    try {
      const res = await fetch('/api/newsletter', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subject, message }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error ?? 'Erreur');
      setMsg({ type: 'ok', text: `Newsletter envoyée à ${d.sent} abonné(s) ✓` });
      setSubject(''); setMessage('');
    } catch (err) {
      setMsg({ type: 'err', text: err instanceof Error ? err.message : 'Erreur' });
    } finally {
      setSending(false);
    }
  };

  const input = 'w-full px-3.5 py-2.5 rounded-xl bg-beige-100 border border-beige-200 text-brown-900 text-sm focus:outline-none focus:border-gold-400 transition-colors';

  return (
    <div className="min-h-screen pt-24 pb-20">
      <div className="max-w-xl mx-auto px-5 sm:px-6">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-4xl font-light text-brown-900" style={{ fontFamily: 'var(--font-cormorant)' }}>Newsletter</h1>
          <Link href="/dashboard" className="text-sm text-brown-500 hover:text-brown-800 transition-colors">← Dashboard</Link>
        </div>

        <div className="rounded-2xl bg-beige-50 border border-beige-200 p-4 mb-6 flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3">
            <span className="text-2xl">📣</span>
            <p className="text-sm text-brown-700">
              {count === null ? 'Chargement…' : <><span className="font-semibold">{count}</span> abonné{count > 1 ? 's' : ''} recevront votre message.</>}
            </p>
          </div>
          <label className={`text-xs font-medium px-3 py-2 rounded-xl border border-beige-300 cursor-pointer hover:bg-beige-100 transition-colors ${importing ? 'opacity-50 pointer-events-none' : ''}`}>
            {importing ? 'Import…' : '📥 Importer un CSV'}
            <input type="file" accept=".csv,.txt,text/csv,text/plain" className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) handleImport(f); e.target.value = ''; }} />
          </label>
        </div>

        <form onSubmit={send} className="rounded-2xl bg-beige-50 border border-beige-200 p-6 space-y-3">
          <input className={input} placeholder="Sujet" value={subject} onChange={(e) => setSubject(e.target.value)} />
          <textarea className={`${input} resize-none`} rows={8} placeholder="Votre message…" value={message} onChange={(e) => setMessage(e.target.value)} />
          {msg && <p className={`text-sm ${msg.type === 'ok' ? 'text-green-600' : 'text-red-500'}`}>{msg.text}</p>}
          <motion.button type="submit" disabled={sending || !subject || !message || count === 0}
            className="px-6 py-2.5 rounded-xl bg-brown-900 text-beige-50 text-sm font-medium disabled:opacity-40"
            whileTap={{ scale: 0.98 }}>
            {sending ? 'Envoi…' : 'Envoyer à tous les abonnés'}
          </motion.button>
        </form>
      </div>
    </div>
  );
}
