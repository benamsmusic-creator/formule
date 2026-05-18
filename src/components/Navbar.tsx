'use client';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();

  // Only show admin navbar on dashboard and builder pages
  const isAdminPage = pathname.startsWith('/dashboard') || pathname.startsWith('/builder');
  if (!isAdminPage) return null;

  const handleLogout = async () => {
    await fetch('/api/auth', { method: 'DELETE' });
    router.push('/login');
  };

  return (
    <motion.nav
      className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-4 sm:px-8 py-3 sm:py-5"
      initial={{ y: -80, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
    >
      <div className="absolute inset-0 glass border-b border-gold-400/10" />

      {/* Logo */}
      <Link href="/dashboard" className="relative flex items-center gap-2 group">
        <motion.div
          className="w-8 h-8 rounded-lg bg-gradient-to-br from-gold-400 to-gold-600 flex items-center justify-center flex-shrink-0"
          whileHover={{ rotate: 10, scale: 1.1 }}
          transition={{ type: 'spring', stiffness: 300 }}
        >
          <span className="text-beige-50 text-xs font-bold">H</span>
        </motion.div>
        <span
          className="relative text-brown-900 font-bold text-lg tracking-tight"
          style={{ fontFamily: 'var(--font-cormorant)' }}
        >
          HabadLyon
        </span>
      </Link>

      {/* Desktop nav links */}
      <div className="relative hidden sm:flex items-center gap-1">
        {[
          { href: '/dashboard', label: 'Réservations' },
          { href: '/builder', label: 'Créer' },
        ].map((link) => (
          <Link key={link.href} href={link.href}>
            <motion.span
              className={`relative px-4 py-2 text-sm rounded-lg inline-block transition-colors ${
                pathname.startsWith(link.href)
                  ? 'text-brown-900 font-medium'
                  : 'text-brown-600 hover:text-brown-900'
              }`}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              {pathname.startsWith(link.href) && (
                <motion.div
                  layoutId="nav-pill"
                  className="absolute inset-0 bg-beige-200 rounded-lg"
                  transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                />
              )}
              <span className="relative z-10">{link.label}</span>
            </motion.span>
          </Link>
        ))}

        <motion.button
          onClick={handleLogout}
          className="ml-1 px-4 py-2 text-sm text-brown-400 hover:text-brown-700 rounded-lg transition-colors"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          title="Se déconnecter"
        >
          ⎋
        </motion.button>
      </div>

      {/* Mobile nav */}
      <div className="relative flex sm:hidden items-center gap-2">
        <Link href="/dashboard">
          <motion.button
            className={`px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
              pathname.startsWith('/dashboard') ? 'bg-beige-200 text-brown-900' : 'text-brown-500'
            }`}
            whileTap={{ scale: 0.95 }}
          >
            Accueil
          </motion.button>
        </Link>

        <motion.button
          onClick={handleLogout}
          className="w-10 h-10 flex items-center justify-center rounded-xl bg-beige-100 border border-beige-200 text-brown-400 text-sm"
          whileTap={{ scale: 0.92 }}
          title="Se déconnecter"
        >
          ⎋
        </motion.button>
      </div>
    </motion.nav>
  );
}
