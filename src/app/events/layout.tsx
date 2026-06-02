import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Événements',
  description: 'Découvrez et inscrivez-vous aux prochains événements de HabadLyon : dîners, soirées, célébrations et gala.',
  openGraph: {
    title: 'Événements · HabadLyon',
    description: 'Inscrivez-vous aux prochains événements de la communauté HabadLyon à Lyon.',
    type: 'website',
  },
};

export default function EventsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
