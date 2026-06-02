'use client';
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { SkeletonBox } from '@/components/Skeleton';

export default function SmsPage() {
  const [count, setCount] = useState<number | null>(null);
  const [configured, setConfigured] = useState(true);
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [msg, setMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  useEffect(() => {
    fetch('/api/sms').then((r) => r.json()).then((d) => { setCount(d.count ?? 0); setConfigured(!!d.configured); }).catch(() => setCount(0));
  }, []);

  const send = async (e: React.FormEvent) => {
    e.preventDefault(); setSending(true); setMsg(null);
    try {
      const res = await fetch('/api/sms', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ message }) });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error ?? 'Erreur');
      setMsg({ type: 'ok', text: `SMS envoyé à ${d.sent}/${d.total} numéro(s) ✓` });
      setMessage('');
    } catch (err) {
      setMsg({ type: 'err', text: err instanceof Error ? err.message : 'Erreur' });
    } finally { setSending(false); }
  };

  return (
    <div className="min-h-screen pt-24 pb-20">
      <div className="max-w-xl mx-auto px-5 sm:px-6">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-4xl font-light text-brown-900" style={{ fontFamily: 'var(--font-cormorant)' }}>SMS de masse</h1>
          <Link href="/dashboard" className="text-sm text-brown-500 hover:text-brown-800 transition-colors">← Dashboard</Link>
        </div>

        {!configured && (
          <div className="rounded-2xl bg-orange-50 border border-orange-200 p-4 mb-6 text-sm text-orange-800">
            ⚙️ <strong>À activer :</strong> crée un compte gratuit sur <a href="https://www.brevo.com" target="_blank" rel="noopener noreferrer" className="underline">brevo.com</a>, copie ta clé API SMS, et ajoute-la dans Vercel sous le nom <code>BREVO_API_KEY</code>. L’envoi fonctionnera aussitôt.
          </div>
        )}

        <div className="rounded-2xl bg-beige-50 border border-beige-200 p-4 mb-6 flex items-center gap-3">
          <span className="text-2xl">📱</span>
          {count === null
            ? <SkeletonBox className="h-4 w-48 rounded-lg" />
            : <p className="text-sm text-brown-700"><span className="font-semibold">{count}</span> membre(s) avec un numéro valide recevront le SMS.</p>
          }
        </div>

        <form onSubmit={send} className="rounded-2xl bg-beige-50 border border-beige-200 p-6 space-y-3">
          <textarea className="w-full px-3.5 py-2.5 rounded-xl bg-beige-100 border border-beige-200 text-brown-900 text-sm focus:outline-none focus:border-gold-400 transition-colors resize-none"
            rows={4} maxLength={480} placeholder="Votre message (160 caractères = 1 SMS)" value={message} onChange={(e) => setMessage(e.target.value)} />
          <p className="text-[11px] text-brown-400 text-right">{message.length}/480</p>
          {msg && <p className={`text-sm ${msg.type === 'ok' ? 'text-green-600' : 'text-red-500'}`}>{msg.text}</p>}
          <motion.button type="submit" disabled={sending || !message || count === 0}
            className="px-6 py-2.5 rounded-xl bg-brown-900 text-beige-50 text-sm font-medium disabled:opacity-40" whileTap={{ scale: 0.98 }}>
            {sending ? 'Envoi…' : 'Envoyer le SMS'}
          </motion.button>
        </form>
      </div>
    </div>
  );
}
