import Link from 'next/link';
import { ORG } from '@/lib/org';
import ContactForm from './ContactForm';

export const metadata = {
  title: 'Informations & mentions légales',
  description: 'Coordonnées et informations légales de l’association Habad Loubavitch — Lyon ARA.',
};

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-baseline gap-1 sm:gap-3 py-2.5 border-b border-beige-200 last:border-0">
      <span className="text-xs uppercase tracking-wide text-brown-400 sm:w-44 shrink-0">{label}</span>
      <span className="text-sm text-brown-900">{value}</span>
    </div>
  );
}

export default function InfosPage() {
  return (
    <div className="min-h-screen pt-24 pb-20">
      <div className="max-w-2xl mx-auto px-5 sm:px-6">
        <h1 className="text-4xl sm:text-5xl font-light text-brown-900 mb-2" style={{ fontFamily: 'var(--font-cormorant)' }}>
          Informations <em className="gradient-text not-italic">légales</em>
        </h1>
        <p className="text-brown-500 text-sm mb-10">{ORG.name}</p>

        {/* Coordonnées */}
        <section className="rounded-2xl bg-beige-50 border border-beige-200 p-6 mb-6">
          <h2 className="text-xl font-medium text-brown-900 mb-4" style={{ fontFamily: 'var(--font-cormorant)' }}>Coordonnées</h2>
          <Field label="Adresse" value={`${ORG.address}, ${ORG.postalCode} ${ORG.city}`} />
          {ORG.email && <Field label="Email" value={ORG.email} />}
          {ORG.phone && <Field label="Téléphone" value={ORG.phone} />}
        </section>

        {/* Contact */}
        <section className="rounded-2xl bg-beige-50 border border-beige-200 p-6 mb-6">
          <h2 className="text-xl font-medium text-brown-900 mb-1" style={{ fontFamily: 'var(--font-cormorant)' }}>Nous contacter</h2>
          <p className="text-sm text-brown-500 mb-4">Une question ? Écrivez-nous, nous vous répondrons.</p>
          <ContactForm />
        </section>

        {/* Mentions légales */}
        <section className="rounded-2xl bg-beige-50 border border-beige-200 p-6 mb-6">
          <h2 className="text-xl font-medium text-brown-900 mb-4" style={{ fontFamily: 'var(--font-cormorant)' }}>Identité de l’association</h2>
          <Field label="Dénomination" value={ORG.name} />
          <Field label="Forme juridique" value={ORG.legalForm} />
          <Field label="SIREN" value={ORG.siren} />
          <Field label="SIRET (siège)" value={ORG.siret} />
          <Field label="Code APE" value={ORG.ape} />
          <Field label="Déclarée le" value={ORG.createdAt} />
        </section>

        {/* Don */}
        <section className="rounded-2xl bg-beige-50 border border-beige-200 p-6 mb-10">
          <h2 className="text-xl font-medium text-brown-900 mb-3" style={{ fontFamily: 'var(--font-cormorant)' }}>Soutenir l’association</h2>
          <p className="text-sm text-brown-600 mb-4">
            Vous pouvez soutenir {ORG.name} par un don sécurisé en ligne.
          </p>
          <Link href="/don" className="inline-flex items-center px-6 py-3 rounded-xl bg-brown-900 text-beige-50 text-sm font-medium hover:opacity-90 transition-opacity">
            🤲 Faire un don
          </Link>
        </section>

        <div className="text-center">
          <Link href="/" className="text-sm text-brown-400 hover:text-brown-700 transition-colors">
            ← Retour à l’accueil
          </Link>
        </div>
      </div>
    </div>
  );
}
