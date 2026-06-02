import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Horaires de Chabbat — Lyon',
  description: 'Horaires de Chabbat pour Lyon : allumage des bougies, havdalah, paracha et zmanim, calculés automatiquement.',
  openGraph: {
    title: 'Horaires de Chabbat à Lyon · HabadLyon',
    description: 'Allumage des bougies, havdalah et zmanim pour Lyon, mis à jour chaque semaine.',
    type: 'website',
  },
};

export default function HorairesLayout({ children }: { children: React.ReactNode }) {
  return children;
}
