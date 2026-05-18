import type { Metadata } from 'next';
import { Cormorant_Garamond, Inter } from 'next/font/google';
import './globals.css';
import Cursor from '@/components/Cursor';
import AnimatedBackground from '@/components/AnimatedBackground';
import Navbar from '@/components/Navbar';

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
  title: 'FormLux — Formulaires d\'exception',
  description: 'Créez des formulaires élégants avec paiement Stripe intégré.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" className={`${cormorant.variable} ${inter.variable}`}>
      <body className="min-h-screen antialiased">
        <Cursor />
        <AnimatedBackground />
        <Navbar />
        <main>{children}</main>
      </body>
    </html>
  );
}
