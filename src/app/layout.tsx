import type { Metadata, Viewport } from 'next';
import { Cormorant_Garamond, Inter } from 'next/font/google';
import './globals.css';
import AnimatedBackground from '@/components/AnimatedBackground';
import Navbar from '@/components/Navbar';
import PublicNav from '@/components/PublicNav';
import ScrollToTop from '@/components/ScrollToTop';
import ThemeToggle from '@/components/ThemeToggle';

const cormorant = Cormorant_Garamond({
  variable: '--font-cormorant',
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
  style: ['normal', 'italic'],
});

const inter = Inter({
  variable: '--font-inter',
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
});

export const metadata: Metadata = {
  metadataBase: new URL('https://www.habadlyon.info'),
  title: {
    default: 'HabadLyon — Événements, dons & horaires de Chabbat',
    template: '%s · HabadLyon',
  },
  description:
    "Inscrivez-vous aux événements de HabadLyon, réservez votre table de gala, faites un don et consultez les horaires de Chabbat pour Lyon.",
  keywords: ['HabadLyon', 'Habad Lyon', 'événements juifs Lyon', 'don', 'gala', 'horaires Chabbat Lyon', 'communauté juive Lyon'],
  openGraph: {
    type: 'website',
    locale: 'fr_FR',
    siteName: 'HabadLyon',
    title: 'HabadLyon — Événements, dons & horaires de Chabbat',
    description:
      "Événements, réservations de gala, dons en ligne et horaires de Chabbat pour la communauté de Lyon.",
    url: 'https://www.habadlyon.info',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'HabadLyon',
    description: 'Événements, dons et horaires de Chabbat pour la communauté de Lyon.',
  },
  appleWebApp: { capable: true, title: 'HabadLyon', statusBarStyle: 'default' },
};

export const viewport: Viewport = {
  themeColor: '#2C1810',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" className={`${cormorant.variable} ${inter.variable}`}>
      <body className="min-h-screen antialiased">
        <script
          dangerouslySetInnerHTML={{
            __html: `try{var t=localStorage.getItem('theme');if(t==='dark'||(!t&&window.matchMedia&&window.matchMedia('(prefers-color-scheme:dark)').matches)){document.documentElement.classList.add('dark')}}catch(e){}`,
          }}
        />
        <AnimatedBackground />
        <Navbar />
        <PublicNav />
        <main>{children}</main>
        <ScrollToTop />
        <ThemeToggle />
      </body>
    </html>
  );
}
