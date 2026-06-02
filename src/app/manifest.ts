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
    orientation: 'portrait-primary',
    categories: ['social', 'lifestyle'],
    icons: [
      { src: '/favicon.ico', sizes: 'any', type: 'image/x-icon' },
      { src: '/icon',        sizes: '32x32', type: 'image/png' },
      { src: '/apple-icon', sizes: '180x180', type: 'image/png', purpose: 'any' as const },
    ],
  };
}
