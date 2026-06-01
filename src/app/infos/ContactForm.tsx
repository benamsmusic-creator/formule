'use client';
import { useState } from 'react';
import { motion } from 'framer-motion';

export default function ContactForm() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');

  const canSend = name.trim() && email.trim() && message.trim() && status !== 'sending';

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSend) return;
    setStatus('sending');
    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), email: email.trim(), message: message.trim() }),
      });
      if (!res.ok) throw new Error();
      setStatus('sent');
      setName(''); setEmail(''); setMessage('');
    } catch {
      setStatus('error');
    }
  };

  if (status === 'sent') {
    return (
      <div className="rounded-xl bg-green-50 border border-green-200 p-5 text-center">
        <p className="text-green-700 text-sm font-medium">✓ Message envoyé. Nous vous répondrons rapidement.</p>
      </div>
    );
  }

  const input = 'w-full px-3.5 py-2.5 rounded-xl bg-beige-100 border border-beige-200 text-brown-900 text-sm focus:outline-none focus:border-gold-400 transition-colors';

  return (
    <form onSubmit={submit} className="space-y-3">
      <input className={input} placeholder="Votre nom" value={name} onChange={(e) => setName(e.target.value)} />
      <input className={input} type="email" placeholder="Votre email" value={email} onChange={(e) => setEmail(e.target.value)} />
      <textarea className={`${input} resize-none`} rows={4} placeholder="Votre message" value={message} onChange={(e) => setMessage(e.target.value)} />
      {status === 'error' && <p className="text-xs text-red-500">Une erreur est survenue. Réessayez.</p>}
      <motion.button
        type="submit" disabled={!canSend}
        className="w-full py-3 rounded-xl bg-brown-900 text-beige-50 text-sm font-medium disabled:opacity-40 disabled:cursor-not-allowed"
        whileHover={canSend ? { scale: 1.01 } : {}} whileTap={canSend ? { scale: 0.98 } : {}}
      >
        {status === 'sending' ? 'Envoi…' : 'Envoyer le message'}
      </motion.button>
    </form>
  );
}
