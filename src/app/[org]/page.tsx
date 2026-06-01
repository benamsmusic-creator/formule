'use client';
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import Image from 'next/image';
import { useParams } from 'next/navigation';
import { Form } from '@/lib/types';

export default function OrgPublicPage() {
  const params = useParams();
  const slug = String(params.org ?? '');
  const [orgName, setOrgName] = useState<string | null>(null);
  const [accent, setAccent] = useState<string>('#C9A96E');
  const [forms, setForms] = useState<Form[]>([]);
  const [hasDonation, setHasDonation] = useState(false);
  const [state, setState] = useState<'loading' | 'ready' | 'notfound'>('loading');

  useEffect(() => {
    if (!slug) return;
    let alive = true;
    (async () => {
      const orgRes = await fetch(`/api/orgs/${slug}`);
      if (!orgRes.ok) { if (alive) setState('notfound'); return; }
      const org = await orgRes.json();
      const formsRes = await fetch(`/api/forms?org=${encodeURIComponent(slug)}`);
      const data = await formsRes.json();
      if (!alive) return;
      setOrgName(org.name);
      if (org.accent_color) setAccent(org.accent_color);
      const all: Form[] = Array.isArray(data) ? data : [];
      setForms(all.filter((f) => !f.archived && !f.disabled && !f.id.startsWith('dons-')));
      setHasDonation(all.some((f) => f.id === `dons-${slug}` && !f.archived && !f.disabled));
      setState('ready');
    })().catch(() => { if (alive) setState('notfound'); });
    return () => { alive = false; };
  }, [slug]);

  if (state === 'loading') {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1.2, ease: 'linear' }}
          className="w-8 h-8 border-2 border-gold-400 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (state === 'notfound') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6 text-center">
        <div className="text-6xl text-beige-300 mb-6">◈</div>
        <h1 className="text-3xl font-light text-brown-900 mb-3" style={{ fontFamily: 'var(--font-cormorant)' }}>Communauté introuvable</h1>
        <Link href="/" className="text-sm text-brown-400 hover:text-brown-700 transition-colors mt-2">← Accueil</Link>
      </div>
    );
  }

  const accentVars = {
    '--color-gold-300': accent,
    '--color-gold-400': accent,
    '--color-gold-500': accent,
    '--color-gold-600': accent,
  } as React.CSSProperties;

  return (
    <div className="min-h-screen pt-24 pb-20" style={accentVars}>
      <div className="max-w-5xl mx-auto px-5 sm:px-6">
        <motion.div className="mb-12 text-center" initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
          <h1 className="text-5xl sm:text-6xl font-light text-brown-900 mb-3" style={{ fontFamily: 'var(--font-cormorant)' }}>
            {orgName}
          </h1>
          <p className="text-brown-500 text-base">Nos prochains événements</p>
          {hasDonation && (
            <Link href={`/forms/dons-${slug}`} className="inline-block mt-4">
              <motion.span
                className="inline-flex items-center px-6 py-3 rounded-2xl border-2 border-gold-400/40 text-brown-800 text-sm font-medium hover:bg-gold-400/10 transition-colors"
                whileHover={{ scale: 1.03, y: -2 }} whileTap={{ scale: 0.97 }}>
                🤲 Faire un don
              </motion.span>
            </Link>
          )}
        </motion.div>

        {forms.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="text-6xl text-beige-300 mb-6">◈</div>
            <p className="text-brown-400 text-sm">Aucun événement disponible pour le moment.</p>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {forms.map((form, i) => {
              const dateField = form.fields.find((f) => f.type === 'event_date');
              return (
                <motion.div key={form.id}
                  initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.08, duration: 0.5 }}
                  className="group bg-beige-50 rounded-2xl border border-beige-200 overflow-hidden hover:border-gold-400/40 transition-all"
                  whileHover={{ y: -4, boxShadow: '0 20px 60px rgba(44,24,16,0.08)' }}>
                  {form.coverImage ? (
                    <div className="relative h-48 overflow-hidden">
                      <Image src={form.coverImage} alt={form.title} fill className="object-cover object-top" unoptimized />
                      <div className="absolute inset-0 bg-gradient-to-t from-brown-900/60 to-transparent" />
                    </div>
                  ) : <div className="h-1 bg-gradient-to-r from-gold-400/60 to-transparent" />}
                  <div className="p-6">
                    <h3 className="text-xl font-medium text-brown-900 mb-1" style={{ fontFamily: 'var(--font-cormorant)' }}>{form.title}</h3>
                    {form.description && <p className="text-sm text-brown-500 mb-4 line-clamp-2">{form.description}</p>}
                    {dateField?.presetValue && (
                      <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-gold-400/10 border border-gold-400/20 text-gold-600 text-xs font-medium mb-4">
                        📅 {dateField.presetValue}
                      </div>
                    )}
                    <Link href={`/forms/${form.id}`}>
                      <motion.button className="btn-liquid w-full py-3 bg-brown-900 text-beige-50 rounded-xl text-sm font-medium overflow-hidden"
                        whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}>
                        <span className="relative z-10">S&apos;inscrire →</span>
                      </motion.button>
                    </Link>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
