import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Faire un don',
  description: 'Soutenez la communauté HabadLyon. Don en ligne sécurisé, reçu fiscal — votre générosité fait la différence.',
  openGraph: {
    title: 'Faire un don · HabadLyon',
    description: 'Soutenez HabadLyon — don en ligne sécurisé avec reçu fiscal.',
    type: 'website',
  },
};

export default function DonLayout({ children }: { children: React.ReactNode }) {
  return children;
}
