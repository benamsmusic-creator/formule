import type { MetadataRoute } from 'next';
import { supabaseAdmin } from '@/lib/supabase-admin';

const base = 'https://www.habadlyon.info';

// Rafraîchit le sitemap toutes les heures (nouveaux événements)
export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticEntries: MetadataRoute.Sitemap = [
    { url: `${base}/`, changeFrequency: 'weekly', priority: 1 },
    { url: `${base}/events`, changeFrequency: 'weekly', priority: 0.9 },
    { url: `${base}/don`, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${base}/horaires`, changeFrequency: 'daily', priority: 0.8 },
    { url: `${base}/infos`, changeFrequency: 'yearly', priority: 0.3 },
  ];

  // Pages d'événements individuelles (formulaires actifs publics)
  let eventEntries: MetadataRoute.Sitemap = [];
  try {
    const { data } = await supabaseAdmin
      .from('forms')
      .select('id, updated_at, is_archived, is_disabled')
      .eq('is_archived', false)
      .eq('is_disabled', false);
    eventEntries = (data ?? [])
      .filter((f) => f.id && f.id !== 'dons-generaux')
      .map((f) => ({
        url: `${base}/forms/${f.id}`,
        lastModified: f.updated_at ? new Date(f.updated_at as string) : undefined,
        changeFrequency: 'weekly' as const,
        priority: 0.7,
      }));
  } catch {
    /* base indisponible — on renvoie au moins les pages statiques */
  }

  return [...staticEntries, ...eventEntries];
}
