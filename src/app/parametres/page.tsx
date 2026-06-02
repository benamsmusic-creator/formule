'use client';
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';

const PRESETS = ['#C9A96E', '#1E6F5C', '#2563EB', '#7C3AED', '#DC2626', '#0EA5E9', '#D97706', '#BE185D'];

function ReadonlyLink() {
  const [copied, setCopied] = useState(false);
  if (typeof window === 'undefined') return null;
  const token = btoa('habadlyon2025::readonly');
  const url = `${window.location.origin}/login?readonly=${token}`;
  const copy = () => { navigator.clipboard.writeText(url); setCopied(true); setTimeout(() => setCopied(false), 2000); };
  return (
    <div className="flex items-center gap-2">
      <input readOnly value={url} className="flex-1 text-xs px-3 py-2 rounded-xl bg-beige-100 border border-beige-200 text-brown-600 truncate focus:outline-none" />
      <button onClick={copy} className="flex-shrink-0 px-4 py-2 rounded-xl bg-brown-900 text-beige-50 text-xs font-medium hover:bg-brown-800 transition-colors">
        {copied ? '✓ Copié' : 'Copier'}
      </button>
    </div>
  );
}

export default function ParametresPage() {
  const [name, setName] = useState('');
  const [color, setColor] = useState('#C9A96E');
  const [logoUrl, setLogoUrl] = useState('');
  const [uploading, setUploading] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [photos, setPhotos] = useState<{ id: string; url: string }[]>([]);
  const [photoUploading, setPhotoUploading] = useState(false);

  const loadPhotos = () => {
    fetch('/api/gallery').then((r) => r.json()).then((d) => { if (Array.isArray(d)) setPhotos(d); });
  };
  useEffect(loadPhotos, []);

  const addPhoto = async (file: File) => {
    setPhotoUploading(true);
    try {
      const fd = new FormData(); fd.append('file', file);
      const up = await fetch('/api/upload', { method: 'POST', body: fd });
      const ud = await up.json();
      if (!up.ok || !ud.url) throw new Error();
      await fetch('/api/gallery', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ url: ud.url }) });
      loadPhotos();
    } finally {
      setPhotoUploading(false);
    }
  };

  const removePhoto = async (id: string) => {
    await fetch('/api/gallery', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) });
    setPhotos((p) => p.filter((x) => x.id !== id));
  };

  useEffect(() => {
    fetch('/api/org-settings').then((r) => r.json()).then((d) => {
      if (d?.name) setName(d.name);
      if (d?.accent_color) setColor(d.accent_color);
      if (d?.logo_url) setLogoUrl(d.logo_url);
    }).finally(() => setLoaded(true));
  }, []);

  const uploadLogo = async (file: File) => {
    setUploading(true); setMsg(null);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch('/api/upload', { method: 'POST', body: fd });
      const d = await res.json();
      if (!res.ok || !d.url) throw new Error(d.error ?? 'Upload échoué');
      setLogoUrl(d.url);
    } catch (err) {
      setMsg(err instanceof Error ? err.message : 'Upload échoué');
    } finally {
      setUploading(false);
    }
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true); setMsg(null);
    try {
      const res = await fetch('/api/org-settings', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, accentColor: color, logoUrl }),
      });
      if (!res.ok) throw new Error();
      setMsg('Réglages enregistrés ✓');
    } catch {
      setMsg("Erreur lors de l’enregistrement.");
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
              <label className="text-xs text-brown-500 uppercase tracking-wide font-medium">Logo</label>
              <div className="mt-2 flex items-center gap-4">
                <div className="w-16 h-16 rounded-2xl bg-beige-100 border border-beige-200 flex items-center justify-center overflow-hidden flex-shrink-0">
                  {logoUrl
                    // eslint-disable-next-line @next/next/no-img-element
                    ? <img src={logoUrl} alt="Logo" className="w-full h-full object-contain" />
                    : <span className="text-brown-300 text-xl">🏛️</span>}
                </div>
                <div className="flex items-center gap-2">
                  <label className="cursor-pointer text-xs font-medium text-brown-600 border border-beige-200 px-4 py-2 rounded-xl hover:border-gold-400/40 transition-colors">
                    {uploading ? 'Envoi…' : 'Choisir une image'}
                    <input type="file" accept="image/*" className="hidden"
                      onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadLogo(f); }} disabled={uploading} />
                  </label>
                  {logoUrl && (
                    <button type="button" onClick={() => setLogoUrl('')} className="text-xs text-brown-400 hover:text-red-500 transition-colors">Retirer</button>
                  )}
                </div>
              </div>
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

            {msg && <p className={`text-sm ${msg.startsWith('Erreur') ? 'text-red-500' : 'text-green-600'}`}>{msg}</p>}

            <motion.button type="submit" disabled={saving}
              className="px-6 py-2.5 rounded-xl bg-brown-900 text-beige-50 text-sm font-medium disabled:opacity-40"
              whileTap={{ scale: 0.98 }}>
              {saving ? 'Enregistrement…' : 'Enregistrer'}
            </motion.button>
          </form>
        )}

        {/* Accès en lecture seule (#69) */}
        {loaded && (
          <div className="mt-6 rounded-2xl bg-beige-50 border border-beige-200 p-6">
            <h2 className="text-lg font-medium text-brown-900 mb-1" style={{ fontFamily: 'var(--font-cormorant)' }}>Accès en lecture seule</h2>
            <p className="text-xs text-brown-500 mb-4">Partagez ce lien avec un trésorier ou secrétaire — accès lecture seule (pas de modification, pas d'envoi).</p>
            <ReadonlyLink />
          </div>
        )}

        {/* Galerie photos */}
        {loaded && (
          <div className="mt-6 rounded-2xl bg-beige-50 border border-beige-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-medium text-brown-900" style={{ fontFamily: 'var(--font-cormorant)' }}>Galerie photos</h2>
              <label className="cursor-pointer text-xs font-medium text-brown-600 border border-beige-200 px-4 py-2 rounded-xl hover:border-gold-400/40 transition-colors">
                {photoUploading ? 'Envoi…' : '+ Ajouter une photo'}
                <input type="file" accept="image/*" className="hidden" disabled={photoUploading}
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) addPhoto(f); }} />
              </label>
            </div>
            {photos.length === 0 ? (
              <p className="text-sm text-brown-400">Aucune photo. Ajoutez-en pour les afficher sur votre site public.</p>
            ) : (
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                {photos.map((p) => (
                  <div key={p.id} className="relative group aspect-square rounded-xl overflow-hidden border border-beige-200">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={p.url} alt="" className="w-full h-full object-cover" />
                    <button onClick={() => removePhoto(p.id)}
                      className="absolute top-1 right-1 w-6 h-6 rounded-full bg-brown-900/70 text-white text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                      aria-label="Supprimer">×</button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
