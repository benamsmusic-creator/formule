import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/dashboard', '/builder', '/login', '/compte', '/api/'],
    },
    sitemap: 'https://www.habadlyon.info/sitemap.xml',
  };
}
