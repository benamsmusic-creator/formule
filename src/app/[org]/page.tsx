'use client';
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import Image from 'next/image';
import { useParams } from 'next/navigation';
import { Form } from '@/lib/types';
import AuctionSection from './AuctionSection';

export default function OrgPublicPage() {
  const params = useParams();
  const slug = String(params.org ?? '');
  const [orgName, setOrgName] = useState<string | null>(null);
  const [accent, setAccent] = useState<string>('#C9A96E');
  const [logo, setLogo] = useState<string>('');
  const [forms, setForms] = useState<Form[]>([]);
  const [hasDonation, setHasDonation] = useState(false);
  const [photos, setPhotos] = useState<{ id: string; url: string }[]>([]);
  const [directory, setDirectory] = useState<{ id: string; category: string; name: string; address: string; phone: string; url: string }[]>([]);
  const [announcements, setAnnouncements] = useState<{ id: string; kind: string; title: string; body: string }[]>([]);
  const [memorial, setMemorial] = useState<{ id: string; name: string; hebLabel: string }[]>([]);
  const [subEmail, setSubEmail] = useState('');
  const [subDone, setSubDone] = useState(false);
  const [state, setState] = useState<'loading' | 'ready' | 'notfound'>('loading');

  const subscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/newsletter/subscribe', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ org: slug, email: subEmail }),
      });
      if (res.ok) { setSubDone(true); setSubEmail(''); }
    } catch { /* ignore */ }
  };

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
      if (org.logo_url) setLogo(org.logo_url);
      const all: Form[] = Array.isArray(data) ? data : [];
      setForms(all.filter((f) => !f.archived && !f.disabled && !f.id.startsWith('dons-')));
      setHasDonation(all.some((f) => f.id === `dons-${slug}` && !f.archived && !f.disabled));
      try {
        const g = await (await fetch(`/api/gallery?org=${encodeURIComponent(slug)}`)).json();
        if (Array.isArray(g)) setPhotos(g);
        const dir = await (await fetch(`/api/directory?org=${encodeURIComponent(slug)}`)).json();
        if (Array.isArray(dir)) setDirectory(dir);
        const ann = await (await fetch(`/api/announcements?org=${encodeURIComponent(slug)}`)).json();
        if (Array.isArray(ann)) setAnnouncements(ann);
        const mem = await (await fetch(`/api/memorial?org=${encodeURIComponent(slug)}`)).json();
        if (Array.isArray(mem)) setMemorial(mem);
      } catch { /* ignore */ }
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
          {logo && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={logo} alt={orgName ?? ''} className="h-20 w-auto mx-auto mb-5 object-contain" />
          )}
          <h1 className="text-5xl sm:text-6xl font-light text-brown-900 mb-3" style={{ fontFamily: 'var(--font-cormorant)' }}>
            {orgName}
          </h1>
          <p className="text-brown-500 text-base">Nos prochains événements</p>
          {announcements.filter((a) => a.kind === 'urgent').map((a) => (
            <div key={a.id} className="mt-4 mx-auto max-w-md rounded-xl bg-red-50 border border-red-200 text-red-700 px-4 py-3 text-sm">
              ⚠️ <span className="font-medium">{a.title}</span>{a.body ? ` — ${a.body}` : ''}
            </div>
          ))}
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

        {/* Actualités */}
        {announcements.filter((a) => a.kind !== 'urgent').length > 0 && (
          <div className="mt-16 max-w-2xl mx-auto">
            <h2 className="text-2xl font-light text-brown-900 mb-5 text-center" style={{ fontFamily: 'var(--font-cormorant)' }}>Actualités</h2>
            <div className="space-y-3">
              {announcements.filter((a) => a.kind !== 'urgent').map((a) => (
                <div key={a.id} className="p-5 rounded-2xl bg-beige-50 border border-beige-200">
                  <p className="font-medium text-brown-900">{a.kind === 'mazaltov' ? '🎉 ' : ''}{a.title}</p>
                  {a.body && <p className="text-sm text-brown-500 mt-1">{a.body}</p>}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Annuaire */}
        {directory.length > 0 && (
          <div className="mt-16">
            <h2 className="text-2xl font-light text-brown-900 mb-5 text-center" style={{ fontFamily: 'var(--font-cormorant)' }}>Annuaire de la communauté</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {directory.map((d) => (
                <div key={d.id} className="p-4 rounded-2xl bg-beige-50 border border-beige-200">
                  <p className="text-[11px] uppercase tracking-wide text-gold-600">{d.category}</p>
                  <p className="font-medium text-brown-900">{d.name}</p>
                  {d.address && <p className="text-xs text-brown-500 mt-0.5">📍 {d.address}</p>}
                  {d.phone && <p className="text-xs text-brown-500">📞 {d.phone}</p>}
                  {d.url && <a href={d.url} target="_blank" rel="noopener noreferrer" className="text-xs text-gold-700 hover:underline">Site web ↗</a>}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Enchères de mitzvot */}
        <AuctionSection org={slug} />

        {/* Mur du souvenir */}
        {memorial.length > 0 && (
          <div className="mt-16 max-w-2xl mx-auto text-center">
            <h2 className="text-2xl font-light text-brown-900 mb-1" style={{ fontFamily: 'var(--font-cormorant)' }}>Mur du souvenir 🕯️</h2>
            <p className="text-xs text-brown-400 mb-5">Que leur souvenir soit une bénédiction</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {memorial.map((m) => (
                <div key={m.id} className="p-3 rounded-xl bg-beige-50 border border-beige-200">
                  <p className="text-sm font-medium text-brown-800">{m.name}</p>
                  <p className="text-[11px] text-brown-400">{m.hebLabel}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Newsletter */}
        <div className="mt-16 max-w-md mx-auto text-center rounded-3xl bg-beige-50 border border-beige-200 p-8">
          <h2 className="text-2xl font-light text-brown-900 mb-2" style={{ fontFamily: 'var(--font-cormorant)' }}>Restez informé</h2>
          {subDone ? (
            <p className="text-sm text-green-600">✓ Merci ! Vous êtes abonné.</p>
          ) : (
            <>
              <p className="text-sm text-brown-500 mb-4">Recevez nos prochains événements par email.</p>
              <form onSubmit={subscribe} className="flex gap-2">
                <input type="email" required value={subEmail} onChange={(e) => setSubEmail(e.target.value)} placeholder="Votre email"
                  className="flex-1 px-4 py-3 rounded-xl bg-beige-100 border border-beige-200 text-brown-900 text-sm focus:outline-none focus:border-gold-400 transition-colors" />
                <button type="submit" className="px-5 py-3 rounded-xl bg-brown-900 text-beige-50 text-sm font-medium">S&apos;abonner</button>
              </form>
            </>
          )}
        </div>

        {photos.length > 0 && (
          <div className="mt-16">
            <h2 className="text-2xl font-light text-brown-900 mb-5 text-center" style={{ fontFamily: 'var(--font-cormorant)' }}>Galerie</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {photos.map((p) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img key={p.id} src={p.url} alt="" className="w-full aspect-square object-cover rounded-2xl border border-beige-200" />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
