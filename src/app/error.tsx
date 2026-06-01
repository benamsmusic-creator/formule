'use client';
import Link from 'next/link';

export default function Error({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 text-center">
      <div className="text-7xl text-beige-300 mb-6" aria-hidden="true">⚠</div>
      <h1 className="text-3xl font-light text-brown-900 mb-3" style={{ fontFamily: 'var(--font-cormorant)' }}>
        Une erreur est survenue
      </h1>
      <p className="text-brown-500 text-sm max-w-sm mb-8">
        Quelque chose s&apos;est mal passé. Vous pouvez réessayer ou revenir à l&apos;accueil.
      </p>
      <div className="flex flex-col sm:flex-row gap-3">
        <button
          onClick={reset}
          className="px-6 py-3 rounded-xl bg-brown-900 text-beige-50 text-sm font-medium hover:opacity-90 transition-opacity"
        >
          Réessayer
        </button>
        <Link href="/" className="px-6 py-3 rounded-xl border border-gold-400/40 text-brown-800 text-sm font-medium hover:bg-gold-400/10 transition-colors">
          Accueil
        </Link>
      </div>
    </div>
  );
}
