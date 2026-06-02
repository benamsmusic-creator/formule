'use client';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { isAdminPath, NAV_PRIMARY, NAV_GROUPS } from '@/lib/adminRoutes';
import { useTheme } from '@/lib/theme';
import { useNotifications } from '@/hooks/useNotifications';

export default function DashboardSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [me, setMe] = useState<{ superAdmin: boolean; orgName: string | null; role: string | null } | null>(null);
  const [theme, toggleTheme] = useTheme();
  const [showNotifs, setShowNotifs] = useState(false);

  const isAdmin = isAdminPath(pathname);

  useEffect(() => {
    if (!isAdmin) return;
    fetch('/api/me').then((r) => r.json())
      .then((d) => setMe({ superAdmin: !!d.superAdmin, orgName: d.orgName ?? null, role: d.role ?? null }))
      .catch(() => {});
  }, [isAdmin]);

  const { notifs, unreadCount, markAllRead } = useNotifications(isAdmin ? (me?.orgName ?? 'habadlyon') : null);

  // Ferme le tiroir à chaque navigation
  useEffect(() => { setOpen(false); }, [pathname]);

  if (!isAdmin) return null;

  const handleLogout = async () => {
    await fetch('/api/auth', { method: 'DELETE' });
    router.push('/login');
  };

  const isActive = (href: string, exact?: boolean) =>
    exact ? pathname === href : (pathname === href || pathname.startsWith(href + '/'));

  const itemCls = (active: boolean) =>
    `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-colors ${
      active
        ? 'bg-gold-400/15 text-brown-900 font-medium'
        : 'text-brown-600 hover:text-brown-900 hover:bg-beige-100'
    }`;

  const NavContent = (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <Link href="/dashboard" className="flex items-center gap-2.5 px-2 mb-6">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-gold-400 to-gold-600 flex items-center justify-center shadow-lg">
          <span className="text-beige-50 text-sm font-bold">H</span>
        </div>
        <div className="min-w-0">
          <p className="text-brown-900 font-bold text-base leading-tight tracking-tight truncate" style={{ fontFamily: 'var(--font-cormorant)' }}>HabadLyon</p>
          {me?.orgName && <p className="text-[10px] text-brown-400 truncate">{me.orgName}</p>}
        </div>
      </Link>

      {/* Navigation défilante */}
      <nav className="flex-1 overflow-y-auto space-y-5 pr-1" aria-label="Navigation admin">
        <div className="space-y-1">
          {NAV_PRIMARY.map((it) => (
            <Link key={it.href} href={it.href} className={itemCls(isActive(it.href, it.exact))}>
              <span className="w-5 text-center">{it.icon}</span>{it.label}
            </Link>
          ))}
        </div>

        {NAV_GROUPS.map((g) => (
          <div key={g.group}>
            <p className="px-3 mb-1 text-[10px] uppercase tracking-widest text-brown-400">{g.group}</p>
            <div className="space-y-0.5">
              {g.items.map((it) => (
                <Link key={it.href} href={it.href} className={itemCls(isActive(it.href))}>
                  <span className="w-5 text-center">{it.icon}</span>{it.label}
                </Link>
              ))}
            </div>
          </div>
        ))}

        {me?.superAdmin && (
          <div className="border-t border-beige-200 pt-3">
            <Link href="/clients" className={itemCls(isActive('/clients'))}>
              <span className="w-5 text-center">👥</span>Clients
            </Link>
          </div>
        )}
      </nav>

      {/* Cloche notifications (#30) */}
      <div className="relative pt-3 mt-3 border-t border-beige-200">
        <button
          onClick={() => { setShowNotifs((v) => !v); if (!showNotifs) markAllRead(); }}
          className="w-full flex items-center justify-between px-3 py-2 rounded-xl border border-beige-200 text-brown-600 hover:bg-beige-100 transition-colors text-sm mb-2"
          aria-label={`${unreadCount} nouvelle${unreadCount > 1 ? 's' : ''} notification${unreadCount > 1 ? 's' : ''}`}
        >
          <span className="flex items-center gap-2">🔔 Notifications</span>
          {unreadCount > 0 && (
            <span className="w-5 h-5 rounded-full bg-gold-500 text-beige-50 text-[10px] font-bold flex items-center justify-center">{unreadCount}</span>
          )}
        </button>
        <AnimatePresence>
          {showNotifs && (
            <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
              className="absolute bottom-full left-0 right-0 mb-2 rounded-2xl bg-beige-50 border border-beige-200 shadow-xl overflow-hidden max-h-56 overflow-y-auto">
              {notifs.length === 0
                ? <p className="text-xs text-brown-400 text-center py-4">Aucune nouvelle inscription.</p>
                : notifs.map((n) => (
                  <div key={n.id} className="px-3 py-2.5 border-b border-beige-100 last:border-0">
                    <p className="text-xs text-brown-800">{n.message}</p>
                    <p className="text-[10px] text-brown-400 mt-0.5">{n.at.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</p>
                  </div>
                ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Pied : rôle + thème + déconnexion */}
      <div className="space-y-2">
        {me?.superAdmin && (
          <span className="inline-flex items-center gap-1.5 text-[11px] px-2.5 py-1 rounded-full bg-brown-900 text-beige-50 font-medium">👑 Super-admin</span>
        )}
        {me?.role && (
          <span className="inline-flex items-center gap-1.5 text-[11px] px-2.5 py-1 rounded-full bg-gold-400/15 text-gold-700 border border-gold-400/20 font-medium">
            {me.role === 'tresorier' ? '💰 Trésorier (lecture)' : me.role === 'secretaire' ? '📇 Secrétaire (lecture)' : '👁 Lecture seule'}
          </span>
        )}
        <div className="flex items-center gap-2">
          <button onClick={toggleTheme} className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-xl border border-beige-200 text-brown-600 hover:bg-beige-100 transition-colors text-sm">
            {theme === 'dark' ? '☀️ Clair' : '🌙 Sombre'}
          </button>
          <button onClick={handleLogout} title="Se déconnecter" aria-label="Se déconnecter"
            className="px-3 py-2 rounded-xl border border-beige-200 text-brown-500 hover:text-red-500 hover:border-red-200 hover:bg-red-50 transition-colors text-sm">⎋</button>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* ─── Sidebar desktop (fixe) ─── */}
      <aside className="hidden lg:flex fixed top-0 left-0 bottom-0 w-60 z-50 flex-col p-4 bg-beige-50/95 backdrop-blur-md border-r border-beige-200">
        {NavContent}
      </aside>

      {/* ─── Barre mobile ─── */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-4 py-3 bg-beige-50/90 backdrop-blur-md border-b border-beige-200">
        <Link href="/dashboard" className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-gold-400 to-gold-600 flex items-center justify-center">
            <span className="text-beige-50 text-xs font-bold">H</span>
          </div>
          <span className="text-brown-900 font-bold text-base tracking-tight" style={{ fontFamily: 'var(--font-cormorant)' }}>HabadLyon</span>
        </Link>
        <button onClick={() => setOpen(true)} aria-label="Ouvrir le menu" className="tap-target w-10 h-10 flex items-center justify-center rounded-xl border border-beige-200 text-brown-700">
          <span className="text-lg">☰</span>
        </button>
      </div>

      {/* ─── Tiroir mobile ─── */}
      <AnimatePresence>
        {open && (
          <>
            <motion.div
              className="lg:hidden fixed inset-0 z-[60] bg-brown-900/40 backdrop-blur-sm"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setOpen(false)}
            />
            <motion.aside
              className="lg:hidden fixed top-0 left-0 bottom-0 w-72 max-w-[85vw] z-[70] flex flex-col p-4 bg-beige-50 border-r border-beige-200 shadow-2xl"
              initial={{ x: '-100%' }} animate={{ x: 0 }} exit={{ x: '-100%' }}
              transition={{ type: 'spring', stiffness: 360, damping: 36 }}
            >
              <button onClick={() => setOpen(false)} aria-label="Fermer le menu"
                className="self-end mb-2 w-9 h-9 flex items-center justify-center rounded-xl border border-beige-200 text-brown-500">✕</button>
              {NavContent}
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
