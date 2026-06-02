'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { getCurrentUser, getUserResponses } from '@/lib/store';
import { AppUser, Form, FormResponse } from '@/lib/types';
import { ORG } from '@/lib/org';
import { formatDate } from '@/lib/utils';

export default function RecuPage() {
  const router = useRouter();
  const [user] = useState<AppUser | null>(() => getCurrentUser());
  const [dons, setDons] = useState<{ form: Form; response: FormResponse }[]>([]);
  const [loaded, setLoaded] = useState(false);
  const year = new Date().getFullYear();

  useEffect(() => {
    if (!user) { router.push('/user-login'); return; }
    getUserResponses(user.id).then((r) => {
      setDons(r.filter(({ form, response }) =>
        (response.data._donation || form.id.startsWith('dons-')) &&
        response.paymentStatus === 'paid' &&
        response.submittedAt && new Date(response.submittedAt).getFullYear() === year));
      setLoaded(true);
    });
  }, [router, user, year]);

  const total = dons.reduce((s, { response }) => s + (response.paymentAmount ?? 0), 0);

  if (!loaded) {
    return <div className="min-h-screen flex items-center justify-center text-brown-400 text-sm">Chargement…</div>;
  }

  return (
    <div className="min-h-screen bg-beige-50 py-10 px-5">
      {/* Barre d'actions — masquée à l'impression */}
      <div className="max-w-2xl mx-auto mb-6 flex items-center justify-between print:hidden">
        <Link href="/compte" className="text-sm text-brown-500 hover:text-brown-900 transition-colors">← Mon compte</Link>
        <button onClick={() => window.print()}
          className="px-5 py-2.5 rounded-xl bg-brown-900 text-beige-50 text-sm font-medium hover:bg-brown-800 transition-colors">
          🖨️ Imprimer / PDF
        </button>
      </div>

      {/* Document */}
      <div className="max-w-2xl mx-auto bg-white border border-beige-200 rounded-2xl p-8 sm:p-12 print:border-0 print:shadow-none" style={{ color: '#2C1810' }}>
        <div className="flex items-start justify-between mb-8">
          <div>
            <p className="text-2xl font-semibold" style={{ fontFamily: 'var(--font-cormorant)' }}>{ORG.name}</p>
            <p className="text-xs text-brown-500 mt-1">{ORG.address}, {ORG.postalCode} {ORG.city}</p>
            <p className="text-xs text-brown-500">SIRET {ORG.siret} · {ORG.legalForm}</p>
          </div>
          <div className="w-12 h-12 rounded-xl flex items-center justify-center text-beige-50 font-bold" style={{ background: 'linear-gradient(135deg,#C9A96E,#9A7A3A)' }}>H</div>
        </div>

        <h1 className="text-xl font-semibold mb-1">Attestation de dons — Année {year}</h1>
        <p className="text-sm text-brown-500 mb-8">Reçu récapitulatif des dons effectués via la plateforme HabadLyon.</p>

        <div className="mb-8">
          <p className="text-xs uppercase tracking-widest text-brown-400 mb-1">Donateur</p>
          <p className="text-base font-medium">{user?.firstName} {user?.lastName}</p>
          {user?.email && <p className="text-sm text-brown-500">{user.email}</p>}
        </div>

        {dons.length === 0 ? (
          <p className="text-sm text-brown-500 py-8 text-center border-y border-beige-200">Aucun don enregistré pour {year}.</p>
        ) : (
          <table className="w-full text-sm mb-6">
            <thead>
              <tr className="border-b border-beige-200 text-left text-brown-400">
                <th className="py-2 font-medium">Date</th>
                <th className="py-2 font-medium">Objet</th>
                <th className="py-2 font-medium text-right">Montant</th>
              </tr>
            </thead>
            <tbody>
              {dons.map(({ form, response }) => (
                <tr key={response.id} className="border-b border-beige-100">
                  <td className="py-2.5">{formatDate(response.submittedAt)}</td>
                  <td className="py-2.5">{form.title}</td>
                  <td className="py-2.5 text-right font-medium">{(response.paymentAmount ?? 0).toFixed(2)} €</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        <div className="flex items-center justify-between pt-4 border-t-2 border-brown-900">
          <span className="font-semibold">Total des dons {year}</span>
          <span className="text-2xl font-semibold">{total.toFixed(2)} €</span>
        </div>

        {ORG.taxDeductible && (
          <p className="text-xs text-brown-500 mt-8 leading-relaxed">
            Les dons à {ORG.name} ouvrent droit à une réduction d&apos;impôt au titre de l&apos;article 200 du Code général des impôts.
            Ce document est un récapitulatif des paiements en ligne ; un reçu fiscal officiel (CERFA) peut être délivré sur demande.
          </p>
        )}
        <p className="text-xs text-brown-300 mt-4">Document généré le {formatDate(new Date().toISOString())}.</p>
      </div>
    </div>
  );
}
