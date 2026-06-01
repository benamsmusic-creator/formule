import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 text-center">
      <div className="text-7xl text-beige-300 mb-6" aria-hidden="true">◈</div>
      <p className="text-xs uppercase tracking-widest text-gold-600 mb-2">Erreur 404</p>
      <h1 className="text-4xl font-light text-brown-900 mb-3" style={{ fontFamily: 'var(--font-cormorant)' }}>
        Page introuvable
      </h1>
      <p className="text-brown-500 text-sm max-w-sm mb-8">
        La page que vous cherchez n&apos;existe pas ou a été déplacée.
      </p>
      <div className="flex flex-col sm:flex-row gap-3">
        <Link href="/" className="px-6 py-3 rounded-xl bg-brown-900 text-beige-50 text-sm font-medium hover:opacity-90 transition-opacity">
          Accueil
        </Link>
        <Link href="/events" className="px-6 py-3 rounded-xl border border-gold-400/40 text-brown-800 text-sm font-medium hover:bg-gold-400/10 transition-colors">
          Voir les événements
        </Link>
      </div>
    </div>
  );
}
