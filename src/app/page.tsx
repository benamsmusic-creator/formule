'use client';
import { motion, useScroll, useTransform } from 'framer-motion';
import Link from 'next/link';
import { useRef } from 'react';

const features = [
  {
    icon: '✦',
    title: 'Builder intuitif',
    desc: 'Glissez-déposez vos champs en quelques secondes. Aucune ligne de code.',
  },
  {
    icon: '◈',
    title: 'Paiement Stripe',
    desc: 'Intégrez un champ de paiement directement dans votre formulaire.',
  },
  {
    icon: '⬡',
    title: 'Animations fluides',
    desc: 'Chaque formulaire est une expérience visuelle premium pour vos visiteurs.',
  },
  {
    icon: '◎',
    title: 'Réponses en temps réel',
    desc: 'Suivez vos soumissions et paiements depuis un dashboard élégant.',
  },
];

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.12 } },
};

const fadeUp = {
  hidden: { opacity: 0, y: 40 },
  show: { opacity: 1, y: 0, transition: { duration: 0.7, ease: [0.22, 1, 0.36, 1] as const } },
};

export default function HomePage() {
  const heroRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: heroRef, offset: ['start start', 'end start'] });
  const y = useTransform(scrollYProgress, [0, 1], [0, -120]);
  const opacity = useTransform(scrollYProgress, [0, 0.6], [1, 0]);

  const words = ['Formulaires', "d'exception."];

  return (
    <div className="relative">
      {/* ── HERO ─────────────────────────────────── */}
      <section
        ref={heroRef}
        className="relative min-h-screen flex flex-col items-center justify-center px-6 text-center overflow-hidden"
      >
        {/* Decorative rings */}
        <motion.div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] rounded-full border border-gold-400/10 float-1"
          style={{ opacity }}
        />
        <motion.div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full border border-gold-400/15 float-2"
          style={{ opacity }}
        />

        {/* Badge */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.6 }}
          className="mb-8 inline-flex items-center gap-2 px-4 py-2 rounded-full bg-beige-100 border border-gold-400/30 text-gold-600 text-sm font-medium"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-gold-400 animate-pulse" />
          Créez votre premier formulaire gratuitement
        </motion.div>

        {/* Headline */}
        <motion.div style={{ y, opacity }} className="relative z-10">
          <h1
            className="text-[clamp(3.5rem,10vw,8rem)] font-light leading-[0.9] tracking-tight mb-2"
            style={{ fontFamily: 'var(--font-cormorant)' }}
          >
            {words.map((word, wi) => (
              <motion.span
                key={wi}
                className="inline-block mr-[0.25em]"
                initial={{ opacity: 0, y: 60 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 + wi * 0.15, duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
              >
                {wi === 0 ? (
                  <span className="gradient-text italic">{word}</span>
                ) : (
                  <span className="text-brown-900">{word}</span>
                )}
              </motion.span>
            ))}
          </h1>

          <motion.p
            className="mt-6 text-brown-700 text-lg max-w-xl mx-auto leading-relaxed"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8, duration: 0.7 }}
          >
            Concevez des formulaires luxueux avec paiement Stripe intégré.{' '}
            <span className="text-gold-600 font-medium">Sans une ligne de code.</span>
          </motion.p>

          {/* CTA buttons */}
          <motion.div
            className="mt-10 flex flex-wrap items-center justify-center gap-4"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1, duration: 0.7 }}
          >
            <Link href="/builder">
              <motion.button
                className="btn-liquid relative px-8 py-4 bg-brown-900 text-beige-50 rounded-2xl text-base font-medium overflow-hidden shimmer"
                whileHover={{ scale: 1.03, y: -2 }}
                whileTap={{ scale: 0.97 }}
              >
                <span className="relative z-10 flex items-center gap-2">
                  Créer un formulaire
                  <motion.span
                    animate={{ x: [0, 4, 0] }}
                    transition={{ repeat: Infinity, duration: 1.5 }}
                  >
                    →
                  </motion.span>
                </span>
              </motion.button>
            </Link>

            <Link href="/dashboard">
              <motion.button
                className="relative px-8 py-4 gold-border rounded-2xl text-base font-medium text-brown-800 bg-beige-50"
                whileHover={{ scale: 1.03, y: -2 }}
                whileTap={{ scale: 0.97 }}
              >
                Voir le dashboard
              </motion.button>
            </Link>
          </motion.div>
        </motion.div>

        {/* Scroll indicator */}
        <motion.div
          className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.5, duration: 0.8 }}
        >
          <span className="text-xs text-brown-600 tracking-widest uppercase">Découvrir</span>
          <motion.div
            className="w-px h-10 bg-gradient-to-b from-gold-400 to-transparent"
            animate={{ scaleY: [0.5, 1, 0.5], opacity: [0.5, 1, 0.5] }}
            transition={{ repeat: Infinity, duration: 2, ease: 'easeInOut' }}
          />
        </motion.div>

        {/* Floating decorative elements */}
        <motion.div
          className="absolute top-32 right-24 text-gold-300 text-4xl float-1 select-none opacity-30"
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.3 }}
          transition={{ delay: 1.2 }}
        >
          ✦
        </motion.div>
        <motion.div
          className="absolute bottom-40 left-20 text-gold-400 text-2xl float-2 select-none opacity-20"
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.2 }}
          transition={{ delay: 1.4 }}
        >
          ◈
        </motion.div>
      </section>

      {/* ── FEATURES ────────────────────────────── */}
      <section className="relative py-32 px-6">
        <div className="max-w-6xl mx-auto">
          <motion.div
            className="text-center mb-20"
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7 }}
          >
            <h2
              className="text-[clamp(2.5rem,5vw,4.5rem)] font-light text-brown-900 leading-tight mb-4"
              style={{ fontFamily: 'var(--font-cormorant)' }}
            >
              Tout ce dont vous avez{' '}
              <em className="gradient-text">besoin.</em>
            </h2>
            <p className="text-brown-600 text-lg max-w-md mx-auto">
              Un outil complet pour créer, partager et encaisser.
            </p>
          </motion.div>

          <motion.div
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6"
            variants={stagger}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true }}
          >
            {features.map((f, i) => (
              <motion.div
                key={i}
                variants={fadeUp}
                className="group relative p-8 rounded-3xl bg-beige-100 border border-beige-200 hover:border-gold-400/40 transition-all duration-300 overflow-hidden"
                whileHover={{ y: -6, boxShadow: '0 20px 60px rgba(44,24,16,0.08)' }}
              >
                <motion.div
                  className="absolute inset-0 bg-gradient-to-br from-gold-400/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                />
                <div className="relative z-10">
                  <motion.div
                    className="text-3xl text-gold-500 mb-6"
                    animate={{ rotate: [0, 10, -5, 0] }}
                    transition={{ repeat: Infinity, duration: 5 + i, ease: 'easeInOut' }}
                  >
                    {f.icon}
                  </motion.div>
                  <h3
                    className="text-xl font-medium text-brown-900 mb-3"
                    style={{ fontFamily: 'var(--font-cormorant)' }}
                  >
                    {f.title}
                  </h3>
                  <p className="text-sm text-brown-600 leading-relaxed">{f.desc}</p>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ── FORM PREVIEW SECTION ─────────────────── */}
      <section className="py-32 px-6 bg-beige-100/50">
        <div className="max-w-5xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <motion.div
              initial={{ opacity: 0, x: -50 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
            >
              <span className="text-gold-500 text-sm tracking-widest uppercase font-medium">
                Form Builder
              </span>
              <h2
                className="mt-4 text-[clamp(2rem,4vw,3.5rem)] font-light text-brown-900 leading-tight"
                style={{ fontFamily: 'var(--font-cormorant)' }}
              >
                Construisez en{' '}
                <em className="text-gold-500">glissant.</em>
              </h2>
              <p className="mt-6 text-brown-600 leading-relaxed">
                Ajoutez des champs texte, email, sélection, et même un paiement Stripe en
                quelques clics. Votre formulaire est prêt à être partagé instantanément.
              </p>
              <motion.ul className="mt-8 space-y-3">
                {['Drag & Drop intuitif', 'Aperçu en temps réel', 'Lien de partage unique', 'Stripe intégré nativement'].map(
                  (item, i) => (
                    <motion.li
                      key={i}
                      className="flex items-center gap-3 text-brown-700"
                      initial={{ opacity: 0, x: -20 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      viewport={{ once: true }}
                      transition={{ delay: i * 0.1, duration: 0.5 }}
                    >
                      <span className="w-5 h-5 rounded-full bg-gold-400/20 border border-gold-400/40 flex items-center justify-center text-gold-600 text-xs flex-shrink-0">
                        ✓
                      </span>
                      {item}
                    </motion.li>
                  )
                )}
              </motion.ul>
              <Link href="/builder">
                <motion.button
                  className="btn-liquid mt-10 px-6 py-3 bg-brown-900 text-beige-50 rounded-xl text-sm font-medium overflow-hidden"
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                >
                  <span className="relative z-10">Essayer le builder →</span>
                </motion.button>
              </Link>
            </motion.div>

            {/* Mock form card */}
            <motion.div
              initial={{ opacity: 0, x: 50 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1], delay: 0.2 }}
              className="relative"
            >
              <motion.div
                className="relative p-8 rounded-3xl bg-beige-50 border border-beige-200 shadow-[0_30px_80px_rgba(44,24,16,0.08)]"
                whileHover={{ y: -4 }}
                transition={{ type: 'spring', stiffness: 200 }}
              >
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-gold-400 to-gold-300 rounded-t-3xl" />
                <h3
                  className="text-2xl font-medium text-brown-900 mb-1"
                  style={{ fontFamily: 'var(--font-cormorant)' }}
                >
                  Réserver une consultation
                </h3>
                <p className="text-sm text-brown-500 mb-6">Remplissez ce formulaire pour prendre rendez-vous.</p>

                {[
                  { label: 'Votre nom complet', ph: 'Marie Dupont' },
                  { label: 'Adresse email', ph: 'marie@exemple.fr' },
                ].map((field, i) => (
                  <motion.div
                    key={i}
                    className="mb-4"
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.4 + i * 0.1 }}
                  >
                    <label className="block text-xs text-brown-600 mb-1.5 font-medium tracking-wide uppercase">
                      {field.label}
                    </label>
                    <div className="w-full px-4 py-3 rounded-xl bg-beige-100 border border-beige-200 text-brown-400 text-sm">
                      {field.ph}
                    </div>
                  </motion.div>
                ))}

                <motion.div
                  className="mb-6 p-4 rounded-xl bg-beige-100 border border-gold-400/20"
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.7 }}
                >
                  <div className="flex justify-between text-sm">
                    <span className="text-brown-600">Consultation (1h)</span>
                    <span className="text-brown-900 font-semibold">150 €</span>
                  </div>
                  <div className="mt-2 text-xs text-brown-400 flex items-center gap-1">
                    <span>💳</span> Paiement sécurisé via Stripe
                  </div>
                </motion.div>

                <motion.button
                  className="w-full py-3.5 rounded-xl bg-brown-900 text-beige-50 text-sm font-medium"
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.99 }}
                >
                  Confirmer et payer →
                </motion.button>
              </motion.div>

              <div className="absolute -bottom-4 left-8 right-8 h-8 bg-brown-900/5 rounded-b-3xl blur-xl -z-10" />
            </motion.div>
          </div>
        </div>
      </section>

      {/* ── CTA FINAL ───────────────────────────── */}
      <section className="py-40 px-6 text-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          className="max-w-2xl mx-auto"
        >
          <h2
            className="text-[clamp(2.5rem,6vw,5rem)] font-light text-brown-900 leading-tight mb-6"
            style={{ fontFamily: 'var(--font-cormorant)' }}
          >
            Prêt à créer quelque chose{' '}
            <em className="gradient-text">d&apos;exceptionnel ?</em>
          </h2>
          <p className="text-brown-600 text-lg mb-10">
            Votre premier formulaire est à quelques secondes.
          </p>
          <Link href="/builder">
            <motion.button
              className="btn-liquid inline-flex items-center gap-3 px-10 py-5 bg-brown-900 text-beige-50 rounded-2xl text-base font-medium overflow-hidden"
              whileHover={{ scale: 1.04, y: -3 }}
              whileTap={{ scale: 0.97 }}
            >
              <span className="relative z-10">Commencer maintenant</span>
              <motion.span
                className="relative z-10 text-gold-300"
                animate={{ x: [0, 6, 0] }}
                transition={{ repeat: Infinity, duration: 1.8 }}
              >
                ✦
              </motion.span>
            </motion.button>
          </Link>
        </motion.div>
      </section>

      {/* Footer */}
      <footer className="border-t border-beige-200 py-8 px-6 text-center text-sm text-brown-400">
        <span style={{ fontFamily: 'var(--font-cormorant)' }} className="text-base font-medium text-brown-600">
          FormLux
        </span>{' '}
        — Formulaires d&apos;exception
      </footer>
    </div>
  );
}
