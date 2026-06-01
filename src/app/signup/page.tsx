'use client';
import { useState } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

function slugify(s: string) {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 32);
}

export default function SignupPage() {
  const router = useRouter();
  const [orgName, setOrgName] = useState('');
  const [orgId, setOrgId] = useState('');
  const [slugEdited, setSlugEdited] = useState(false);
  const [adminName, setAdminName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const onName = (v: string) => {
    setOrgName(v);
    if (!slugEdited) setOrgId(slugify(v));
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); setError('');
    try {
      const res = await fetch('/api/signup', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orgId, orgName, adminEmail: email, adminPassword: password, adminName }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error ?? 'Erreur');
      router.push('/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur');
      setLoading(false);
    }
  };

  const input = 'w-full px-4 py-3 rounded-xl bg-beige-100 border border-beige-200 text-brown-900 text-sm focus:outline-none focus:border-gold-400 transition-colors';
  const canSubmit = orgName && orgId && email && password && !loading;

  return (
    <div className="min-h-screen flex items-center justify-center px-6 py-20">
      <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex w-12 h-12 rounded-2xl bg-gradient-to-br from-gold-400 to-gold-600 items-center justify-center mb-4">
            <span className="text-beige-50 font-bold">H</span>
          </div>
          <h1 className="text-3xl font-light text-brown-900" style={{ fontFamily: 'var(--font-cormorant)' }}>
            Créer l’espace de votre <em className="gradient-text not-italic">communauté</em>
          </h1>
          <p className="text-brown-500 text-sm mt-2">Gratuit — événements, dons, billets, en quelques minutes.</p>
        </div>

        <form onSubmit={submit} className="rounded-3xl bg-beige-50 border border-beige-200 p-7 space-y-3 shadow-[0_30px_80px_rgba(44,24,16,0.08)]">
          <div>
            <label className="text-xs text-brown-500 uppercase tracking-wide font-medium">Nom de la communauté</label>
            <input className={`${input} mt-1`} placeholder="Ex : Beth Chalom Paris" value={orgName} onChange={(e) => onName(e.target.value)} />
          </div>
          <div>
            <label className="text-xs text-brown-500 uppercase tracking-wide font-medium">Adresse de votre site</label>
            <div className="mt-1 flex items-center rounded-xl bg-beige-100 border border-beige-200 overflow-hidden focus-within:border-gold-400 transition-colors">
              <span className="pl-3 text-brown-400 text-sm">habadlyon.info/</span>
              <input className="flex-1 px-1 py-3 bg-transparent text-brown-900 text-sm focus:outline-none"
                value={orgId} onChange={(e) => { setSlugEdited(true); setOrgId(slugify(e.target.value)); }} placeholder="beth-chalom" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <input className={input} placeholder="Votre nom" value={adminName} onChange={(e) => setAdminName(e.target.value)} />
            <input className={input} type="email" placeholder="Votre email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <input className={input} type="password" placeholder="Mot de passe (min. 6)" value={password} onChange={(e) => setPassword(e.target.value)} />

          {error && <p className="text-red-500 text-sm">{error}</p>}

          <motion.button type="submit" disabled={!canSubmit}
            className="btn-liquid w-full py-3.5 bg-brown-900 text-beige-50 rounded-xl font-medium text-sm overflow-hidden disabled:opacity-40"
            whileHover={canSubmit ? { scale: 1.01 } : {}} whileTap={canSubmit ? { scale: 0.98 } : {}}>
            <span className="relative z-10">{loading ? 'Création…' : 'Créer mon espace →'}</span>
          </motion.button>
        </form>

        <p className="text-center text-sm text-brown-400 mt-5">
          Déjà un compte ? <Link href="/login" className="text-gold-700 hover:text-gold-600 font-medium">Se connecter</Link>
        </p>
      </motion.div>
    </div>
  );
}
