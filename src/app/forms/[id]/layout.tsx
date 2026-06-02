import type { Metadata } from 'next';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { parseEventDate } from '@/lib/utils';

type Row = {
  title?: string;
  description?: string;
  cover_image?: string;
  fields?: Array<{ type: string; presetValue?: string; venue?: string; amount?: number; tableOptions?: { price: number }[] }>;
};

async function getForm(id: string): Promise<Row | null> {
  try {
    const { data } = await supabaseAdmin
      .from('forms')
      .select('title, description, cover_image, fields')
      .eq('id', id)
      .maybeSingle();
    return (data as Row) ?? null;
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const form = await getForm(id);
  if (!form?.title) return {};
  const description = form.description?.slice(0, 160) ||
    `Inscrivez-vous à « ${form.title} » avec HabadLyon.`;
  return {
    title: form.title,
    description,
    openGraph: {
      title: `${form.title} · HabadLyon`,
      description,
      ...(form.cover_image ? { images: [{ url: form.cover_image }] } : {}),
      type: 'website',
    },
  };
}

export default async function FormLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const form = await getForm(id);

  // Données structurées Event (uniquement si le formulaire a une date d'événement)
  let jsonLd: string | null = null;
  if (form?.title) {
    const dateField = form.fields?.find((f) => f.type === 'event_date');
    const eventDate = parseEventDate(dateField?.presetValue);
    if (eventDate) {
      const paymentField = form.fields?.find((f) => f.type === 'payment');
      const tableField = form.fields?.find((f) => f.type === 'table_reservation');
      const lowPrice = paymentField?.amount
        ?? (tableField?.tableOptions?.length ? Math.min(...tableField.tableOptions.map((o) => o.price)) : undefined);
      jsonLd = JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'Event',
        name: form.title,
        ...(form.description ? { description: form.description } : {}),
        startDate: eventDate.toISOString().slice(0, 10),
        eventStatus: 'https://schema.org/EventScheduled',
        eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
        ...(form.cover_image ? { image: [form.cover_image] } : {}),
        location: {
          '@type': 'Place',
          name: dateField?.venue || 'Lyon',
          address: { '@type': 'PostalAddress', addressLocality: 'Lyon', addressCountry: 'FR' },
        },
        organizer: { '@type': 'Organization', name: 'HabadLyon', url: 'https://www.habadlyon.info' },
        ...(lowPrice !== undefined ? {
          offers: {
            '@type': 'Offer',
            price: lowPrice,
            priceCurrency: 'EUR',
            url: `https://www.habadlyon.info/forms/${id}`,
            availability: 'https://schema.org/InStock',
          },
        } : {}),
      });
    }
  }

  return (
    <>
      {jsonLd && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd }} />}
      {children}
    </>
  );
}
