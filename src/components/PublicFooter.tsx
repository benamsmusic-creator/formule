'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ORG } from '@/lib/org';

// Pied de page sur les pages publiques de contenu (la landing a le sien,
// les pages immersives /forms et /billet restent épurées).
const SHOW_ON = ['/events', '/horaires', '/infos'];

export default function PublicFooter() {
  const pathname = usePathname();
  if (!SHOW_ON.includes(pathname)) return null;

  return (
    <footer className="border-t border-beige-200 mt-10 py-10 safe-bottom">
      <div className="max-w-4xl mx-auto px-6 text-center">
        <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 mb-4 text-sm">
          <Link href="/" className="text-brown-600 hover:text-brown-900 transition-colors">Accueil</Link>
          <Link href="/events" className="text-brown-600 hover:text-brown-900 transition-colors">Événements</Link>
          <Link href="/don" className="text-brown-600 hover:text-brown-900 transition-colors">Faire un don</Link>
          <Link href="/horaires" className="text-brown-600 hover:text-brown-900 transition-colors">Horaires</Link>
          <Link href="/infos" className="text-brown-600 hover:text-brown-900 transition-colors">Mentions légales</Link>
        </div>
        <p className="text-xs text-brown-400">{ORG.address}, {ORG.postalCode} {ORG.city}</p>
        <p className="text-xs text-brown-300 mt-1" style={{ fontFamily: 'var(--font-cormorant)' }}>
          © {new Date().getFullYear()} {ORG.name}
        </p>
      </div>
    </footer>
  );
}
