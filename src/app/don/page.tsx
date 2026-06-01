import { redirect } from 'next/navigation';

// Page publique « Faire un don » — pointe vers le formulaire de don canonique
// qui réutilise tout le moteur (identité → don → paiement Stripe → CRM).
export default function DonPage() {
  redirect('/forms/dons-generaux');
}
