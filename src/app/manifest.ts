import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'HabadLyon — Événements & dons',
    short_name: 'HabadLyon',
    description: 'Événements, réservations de gala, dons et horaires de Chabbat à Lyon.',
    start_url: '/',
    display: 'standalone',
    background_color: '#FAF7F2',
    theme_color: '#2C1810',
    lang: 'fr',
    icons: [{ src: '/favicon.ico', sizes: 'any', type: 'image/x-icon' }],
  };
}
