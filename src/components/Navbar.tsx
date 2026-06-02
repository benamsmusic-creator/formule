'use client';
import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';

const ADMIN_PREFIXES = [
  '/dashboard', '/builder', '/clients', '/parametres', '/newsletter', '/yahrzeit',
  '/annuaire', '/annonces', '/anniversaires', '/historique', '/membres', '/encheres', '/sms', '/plan',
];

const TOOL_GROUPS = [
  { group: 'Communauté', items: [
    { href: '/dashboard/crm', icon: '📇', label: 'CRM' },
    { href: '/membres', icon: '🪪', label: 'Adhésions' },
    { href: '/annuaire', icon: '📒', label: 'Annuaire' },
  ] },
  { group: 'Communication', items: [
    { href: '/annonces', icon: '📢', label: 'Annonces' },
    { href: '/newsletter', icon: '📣', label: 'Newsletter' },
    { href: '/sms', icon: '📱', label: 'SMS' },
  ] },
  { group: 'Cycle de vie', items: [
    { href: '/yahrzeit', icon: '🕯️', label: 'Yahrzeit' },
    { href: '/anniversaires', icon: '🎂', label: 'Anniversaires' },
  ] },
  { group: 'Événements & dons', items: [
    { href: '/encheres', icon: '🔨', label: 'Enchères' },
  ] },
  { group: 'Gestion', items: [
    { href: '/parametres', icon: '⚙️', label: 'Réglages' },
    { href: '/historique', icon: '🕘', label: 'Historique' },
  ] },
];

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [superAdmin, setSuperAdmin] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const isAdminPage = ADMIN_PREFIXES.some((p) => pathname.startsWith(p));

  useEffect(() => {
    if (!isAdminPage) return;
    fetch('/api/me').then((r) => r.json()).then((d) => setSuperAdmin(!!d.superAdmin)).catch(() => {});
  }, [isAdminPage]);

  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  if (!isAdminPage) return null;

  const handleLogout = async () => {
    await fetch('/api/auth', { method: 'DELETE' });
    router.push('/login');
  };

  const linkCls = (active: boolean) =>
    `relative px-3 py-2 text-sm rounded-lg transition-colors ${active ? 'text-brown-900 font-medium bg-beige-200/70' : 'text-brown-600 hover:text-brown-900 hover:bg-beige-100'}`;

  return (
    <motion.nav
      className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-4 sm:px-8 py-3"
      initial={{ y: -60, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
    >
      <div className="absolute inset-0 glass border-b border-gold-400/10" />

      <Link href="/dashboard" className="relative flex items-center gap-2 group flex-shrink-0">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-gold-400 to-gold-600 flex items-center justify-center">
          <span className="text-beige-50 text-xs font-bold">H</span>
        </div>
        <span className="text-brown-900 font-bold text-lg tracking-tight hidden sm:block" style={{ fontFamily: 'var(--font-cormorant)' }}>HabadLyon</span>
      </Link>

      <div className="relative flex items-center gap-1">
        <Link href="/dashboard"><span className={linkCls(pathname === '/dashboard')}>Tableau de bord</span></Link>
        <Link href="/builder"><span className={linkCls(pathname.startsWith('/builder'))}>Créer</span></Link>

        {/* Menu Outils */}
        <div className="relative" ref={ref}>
          <button onClick={() => setOpen((o) => !o)} className={linkCls(false)}>Outils ▾</button>
          <AnimatePresence>
            {open && (
              <motion.div
                initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
                className="absolute right-0 mt-2 w-64 max-h-[70vh] overflow-y-auto rounded-2xl bg-beige-50 border border-beige-200 shadow-2xl p-2"
              >
                {TOOL_GROUPS.map((g) => (
                  <div key={g.group} className="mb-1">
                    <p className="px-3 pt-2 pb-1 text-[10px] uppercase tracking-widest text-brown-400">{g.group}</p>
                    {g.items.map((it) => (
                      <Link key={it.href} href={it.href} onClick={() => setOpen(false)}
                        className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-brown-700 hover:bg-beige-100 transition-colors">
                        <span>{it.icon}</span>{it.label}
                      </Link>
                    ))}
                  </div>
                ))}
                {superAdmin && (
                  <div className="mb-1 border-t border-beige-200 pt-1">
                    <Link href="/clients" onClick={() => setOpen(false)}
                      className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-brown-900 font-medium hover:bg-gold-400/10 transition-colors">
                      <span>👥</span>Clients (super-admin)
                    </Link>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <button onClick={handleLogout} title="Se déconnecter"
          className="ml-1 px-3 py-2 text-sm text-brown-400 hover:text-brown-700 rounded-lg transition-colors">⎋</button>
      </div>
    </motion.nav>
  );
}
