import { supabaseAdmin } from '@/lib/supabase-admin';
import QRCode from 'qrcode';
import Link from 'next/link';
import PrintButton from './PrintButton';

export const dynamic = 'force-dynamic';

type ResponseRow = {
  id: string;
  form_id: string;
  data: Record<string, string | boolean> | null;
  payment_status: string | null;
  payment_method: string | null;
  submitted_at: string | null;
  forms: { title: string } | null;
};

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 py-2.5 border-b border-beige-200 last:border-0">
      <span className="text-xs uppercase tracking-wide text-brown-400">{label}</span>
      <span className="text-sm font-medium text-brown-900 text-right">{value}</span>
    </div>
  );
}

export default async function BilletPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const { data, error } = await supabaseAdmin
    .from('responses')
    .select('id, form_id, data, payment_status, payment_method, submitted_at, forms(title)')
    .eq('id', id)
    .single<ResponseRow>();

  if (error || !data) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6 text-center">
        <div className="text-6xl text-beige-300 mb-6">◈</div>
        <h1 className="text-3xl font-light text-brown-900 mb-3" style={{ fontFamily: 'var(--font-cormorant)' }}>
          Billet introuvable
        </h1>
        <Link href="/" className="text-sm text-brown-400 hover:text-brown-700 transition-colors mt-4">
          ← Retour à l&apos;accueil
        </Link>
      </div>
    );
  }

  const d = data.data ?? {};
  const name = (d._fullName as string) || `${d._firstName ?? ''} ${d._lastName ?? ''}`.trim() || 'Invité';
  const eventTitle = data.forms?.title ?? 'Événement';
  const guests = (d._guestCount as string) || '1';
  const table = d._tableReservation as string | undefined;
  const donation = d._donation as string | undefined;
  const amount = d._totalAmount as string | undefined;
  const paid =
    data.payment_status === 'paid' ? 'Payé en ligne ✓'
    : data.payment_status === 'cash' ? 'À régler sur place'
    : data.payment_status === 'pending' ? 'En attente'
    : '—';
  const dateStr = data.submitted_at
    ? new Date(data.submitted_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
    : '';

  const isDonation = !!donation || data.form_id === 'dons-generaux';
  const headerLabel = isDonation ? 'Reçu de don' : 'Billet';
  const qrCaption = isDonation ? 'Merci pour votre soutien 🙏' : 'À présenter à l’entrée';

  const qr = await QRCode.toDataURL(`https://www.habadlyon.info/billet/${id}`, {
    margin: 1, width: 360, color: { dark: '#2C1810', light: '#FAF7F2' },
  });

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-5 py-16">
      <div className="w-full max-w-sm">
        {/* En-tête billet */}
        <div className="rounded-t-3xl bg-brown-900 text-beige-50 px-6 pt-7 pb-6 text-center">
          <p className="text-xs uppercase tracking-widest text-gold-300/80 mb-1">HabadLyon · {headerLabel}</p>
          <h1 className="text-2xl font-light" style={{ fontFamily: 'var(--font-cormorant)' }}>{eventTitle}</h1>
        </div>

        {/* QR */}
        <div className="bg-beige-50 border-x border-beige-200 px-6 py-6 flex flex-col items-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={qr} alt="QR code du billet" className="w-48 h-48 rounded-xl" />
          <p className="mt-3 text-xs text-brown-400">{qrCaption}</p>
        </div>

        {/* Détails */}
        <div className="rounded-b-3xl bg-beige-50 border border-t-0 border-beige-200 px-6 pb-6">
          <Row label="Nom" value={name} />
          <Row label="Invités" value={guests} />
          {table && <Row label="Réservation" value={table} />}
          {donation && <Row label="Don" value={donation} />}
          {amount && <Row label="Montant" value={`${amount} €`} />}
          <Row label="Paiement" value={paid} />
          {dateStr && <Row label="Inscrit le" value={dateStr} />}
        </div>

        <div className="mt-8 flex flex-col items-center gap-4 print:hidden">
          <PrintButton />
          <Link href="/" className="text-sm text-brown-400 hover:text-brown-700 transition-colors">
            ← Retour à l&apos;accueil
          </Link>
        </div>
      </div>
    </div>
  );
}
