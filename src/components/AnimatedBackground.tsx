'use client';
import { motion, useReducedMotion } from 'framer-motion';

export default function AnimatedBackground() {
  const reduce = useReducedMotion();

  // Si l'utilisateur préfère réduire les animations, on ne bouge pas du tout.
  // Cela économise du CPU/batterie et respecte l'accessibilité (#46/#55).
  if (reduce) {
    return (
      <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none" aria-hidden>
        <div className="absolute -top-40 -right-40 w-[600px] h-[600px] rounded-full"
          style={{ background: 'radial-gradient(circle, rgba(201,169,110,0.15) 0%, rgba(201,169,110,0) 70%)' }} />
        <div className="absolute -bottom-20 -left-20 w-[500px] h-[500px] rounded-full"
          style={{ background: 'radial-gradient(circle, rgba(223,201,181,0.2) 0%, rgba(223,201,181,0) 70%)' }} />
      </div>
    );
  }

  return (
    <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none" aria-hidden>
      {/* Large warm blob top-right */}
      <motion.div
        className="absolute -top-40 -right-40 w-[600px] h-[600px] rounded-full"
        style={{ background: 'radial-gradient(circle, rgba(201,169,110,0.15) 0%, rgba(201,169,110,0) 70%)' }}
        animate={{ x: [0, 30, -10, 0], y: [0, -20, 30, 0], scale: [1, 1.1, 0.95, 1] }}
        transition={{ duration: 18, repeat: Infinity, ease: 'easeInOut' }}
      />
      {/* Medium blob bottom-left */}
      <motion.div
        className="absolute -bottom-20 -left-20 w-[500px] h-[500px] rounded-full"
        style={{ background: 'radial-gradient(circle, rgba(223,201,181,0.2) 0%, rgba(223,201,181,0) 70%)' }}
        animate={{ x: [0, -20, 40, 0], y: [0, 30, -15, 0], scale: [1, 0.9, 1.1, 1] }}
        transition={{ duration: 22, repeat: Infinity, ease: 'easeInOut', delay: 3 }}
      />
      {/* Small blob center */}
      <motion.div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] rounded-full"
        style={{ background: 'radial-gradient(circle, rgba(232,201,126,0.08) 0%, rgba(232,201,126,0) 70%)' }}
        animate={{ x: [0, 50, -30, 0], y: [0, -40, 20, 0], scale: [1, 1.3, 0.8, 1] }}
        transition={{ duration: 15, repeat: Infinity, ease: 'easeInOut', delay: 6 }}
      />
      {/* Noise texture overlay */}
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
          backgroundRepeat: 'repeat',
          backgroundSize: '128px',
        }}
      />
    </div>
  );
}
