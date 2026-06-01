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

/** Parse une date d'événement depuis du texte libre (FR ou ISO). */
export function parseEventDate(raw: string | undefined | null): Date | null {
  if (!raw) return null;
  const iso = Date.parse(raw);
  if (!isNaN(iso)) return new Date(iso);
  const months: Record<string, number> = {
    janvier: 0, février: 1, mars: 2, avril: 3, mai: 4, juin: 5,
    juillet: 6, août: 7, septembre: 8, octobre: 9, novembre: 10, décembre: 11,
  };
  const m = raw.toLowerCase().match(/(\d{1,2})\s+(\w+)\s+(\d{4})/);
  if (m) {
    const month = months[m[2]];
    if (month !== undefined) return new Date(Number(m[3]), month, Number(m[1]));
  }
  return null;
}

/** Génère et télécharge un fichier .ics (événement « journée entière ») pour un agenda. */
export function downloadICS(title: string, date: Date, location?: string): void {
  if (typeof window === 'undefined') return;
  const pad = (n: number) => String(n).padStart(2, '0');
  const ymd = (d: Date) => `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}`;
  const next = new Date(date.getTime() + 24 * 3600 * 1000);
  const uid = `${ymd(date)}-${title.replace(/[^a-z0-9]/gi, '').slice(0, 20)}@habadlyon.info`;
  const esc = (s: string) => s.replace(/([,;\\])/g, '\\$1').replace(/\n/g, '\\n');
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//HabadLyon//Evenements//FR',
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTAMP:${ymd(date)}T000000Z`,
    `DTSTART;VALUE=DATE:${ymd(date)}`,
    `DTEND;VALUE=DATE:${ymd(next)}`,
    `SUMMARY:${esc(title)}`,
    ...(location ? [`LOCATION:${esc(location)}`] : []),
    'END:VEVENT',
    'END:VCALENDAR',
  ];
  const blob = new Blob([lines.join('\r\n')], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${title.replace(/[^a-z0-9]+/gi, '_').toLowerCase()}.ics`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/** Extrait l'ID vidéo depuis toute URL YouTube standard */
export function extractYouTubeId(url: string): string | null {
  if (!url) return null;
  const match = url.match(
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/
  );
  return match ? match[1] : null;
}
