import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { Form } from './types';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Échappe une valeur pour le format CSV (séparateur point-virgule). */
function csvEscape(v: unknown): string {
  const s = v == null ? '' : String(v);
  return /[";\n\r]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
}

/**
 * Exporte les réponses d'un formulaire en CSV (téléchargement navigateur).
 * Compatible Excel français : séparateur `;`, BOM UTF-8, colonnes lisibles.
 */
export function exportResponsesToCSV(form: Form): void {
  const responses = form.responses ?? [];
  const customFields = form.fields.filter(
    (f) => !['payment', 'donation', 'table_reservation', 'info_block'].includes(f.type)
  );

  const headers = [
    'Date', 'Civilité', 'Prénom', 'Nom', 'Email', 'Téléphone', 'Adresse',
    'Nb invités', 'Don', 'Réservation table', 'Montant total (€)',
    'Statut paiement', 'Méthode',
    ...customFields.map((f) => f.label || f.id),
  ];

  const rows = responses.map((r) => {
    const d = (r.data ?? {}) as Record<string, string | boolean>;
    return [
      r.submittedAt ? new Date(r.submittedAt).toLocaleString('fr-FR') : '',
      d._civility ?? '', d._firstName ?? '', d._lastName ?? '',
      d._email ?? '', d._phone ?? '', d._address ?? '',
      d._guestCount ?? '', d._donation ?? '', d._tableReservation ?? '',
      d._totalAmount ?? (r.paymentAmount != null ? String(r.paymentAmount) : ''),
      r.paymentStatus ?? '', r.paymentMethod ?? '',
      ...customFields.map((f) => {
        const val = d[f.id];
        return typeof val === 'boolean' ? (val ? 'Oui' : 'Non') : (val ?? '');
      }),
    ];
  });

  const csv = [headers, ...rows].map((row) => row.map(csvEscape).join(';')).join('\r\n');
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  const safeTitle = (form.title || 'export').replace(/[^a-z0-9]+/gi, '_').toLowerCase();
  a.download = `${safeTitle}_inscriptions.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function generateId(): string {
  return Math.random().toString(36).slice(2, 11);
}

export function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

/** Extrait l'ID vidéo depuis toute URL YouTube standard */
export function extractYouTubeId(url: string): string | null {
  if (!url) return null;
  const match = url.match(
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/
  );
  return match ? match[1] : null;
}
