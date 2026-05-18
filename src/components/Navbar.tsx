'use client';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function Navbar() {
  const pathname = usePathname();

  return (
    <motion.nav
      className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-8 py-5"
      initial={{ y: -80, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
    >
      {/* Glass background */}
      <div className="absolute inset-0 glass border-b border-gold-400/10" />

      {/* Logo */}
      <Link href="/" className="relative flex items-center gap-2 group">
        <motion.div
          className="w-8 h-8 rounded-lg bg-gradient-to-br from-gold-400 to-gold-600 flex items-center justify-center"
          whileHover={{ rotate: 10, scale: 1.1 }}
          transition={{ type: 'spring', stiffness: 300 }}
        >
          <span className="text-beige-50 text-xs font-bold">F</span>
        </motion.div>
        <span
          className="relative text-brown-900 font-bold text-lg tracking-tight"
          style={{ fontFamily: 'var(--font-cormorant)' }}
        >
          FormLux
        </span>
      </Link>

      {/* Nav links */}
      <div className="relative flex items-center gap-1">
        {[
          { href: '/dashboard', label: 'Dashboard' },
          { href: '/builder', label: 'Créer' },
        ].map((link) => (
          <Link key={link.href} href={link.href}>
            <motion.span
              className={`relative px-4 py-2 text-sm rounded-lg inline-block transition-colors ${
                pathname === link.href
                  ? 'text-brown-900 font-medium'
                  : 'text-brown-700 hover:text-brown-900'
              }`}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              {pathname === link.href && (
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

        <Link href="/builder">
          <motion.button
            className="btn-liquid relative ml-2 px-5 py-2 bg-brown-900 text-beige-50 text-sm rounded-lg font-medium overflow-hidden"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.97 }}
          >
            <span className="relative z-10">Nouveau formulaire</span>
          </motion.button>
        </Link>
      </div>
    </motion.nav>
  );
}
