import type { MetadataRoute } from 'next';

export default function sitemap(): MetadataRoute.Sitemap {
  const base = 'https://www.habadlyon.info';
  return [
    { url: `${base}/`, changeFrequency: 'weekly', priority: 1 },
    { url: `${base}/events`, changeFrequency: 'weekly', priority: 0.9 },
    { url: `${base}/don`, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${base}/horaires`, changeFrequency: 'daily', priority: 0.8 },
  ];
}
