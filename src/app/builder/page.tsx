'use client';
import { useState, useCallback, useEffect, useRef, Suspense } from 'react';
import { motion, AnimatePresence, Reorder } from 'framer-motion';
import { useRouter, useSearchParams } from 'next/navigation';
import { createForm, saveFormLocally, saveFormToServer, getForm } from '@/lib/store';
import { FormField, FieldType, Form, FieldOption, PromoCode } from '@/lib/types';
import { generateId, extractYouTubeId } from '@/lib/utils';
import { useToast, Toaster } from '@/components/Toast';
import Image from 'next/image';

/** Compresse une image côté client et retourne un Blob JPEG */
async function compressImage(file: File, maxPx: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = () => {
      const img = document.createElement('img');
      img.onerror = reject;
      img.onload = () => {
        let { width, height } = img;
        if (width > maxPx || height > maxPx) {
          if (width > height) { height = Math.round((height * maxPx) / width); width = maxPx; }
          else { width = Math.round((width * maxPx) / height); height = maxPx; }
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        canvas.getContext('2d')!.drawImage(img, 0, 0, width, height);
        canvas.toBlob(
          (blob) => (blob ? resolve(blob) : reject(new Error('Compression échouée'))),
          'image/jpeg',
          0.78
        );
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
}

/* ─── Types de champs, organisés en 3 catégories claires ───────── */
type FieldTypeDef = { type: FieldType; label: string; icon: string; desc: string; hint: string };
const FIELD_GROUPS: { group: string; emoji: string; note: string; types: FieldTypeDef[] }[] = [
  {
    group: 'Questions', emoji: '💬', note: 'Ce que le visiteur remplit',
    types: [
      { type: 'radio', label: 'Choix unique', icon: '◉', desc: 'Une seule réponse', hint: 'Ex : Adulte / Enfant, Viande / Poisson.' },
      { type: 'select', label: 'Choix avec photos', icon: '🖼️', desc: 'Options, avec image possible', hint: 'Ex : menu du soir illustré.' },
      { type: 'checkbox', label: 'Case à cocher', icon: '☑', desc: 'Oui / non', hint: "Ex : J'accepte, je serai présent(e)." },
      { type: 'text', label: 'Texte court', icon: '✏️', desc: 'Une ligne', hint: "Ex : nom de l'enfant, allergie." },
      { type: 'textarea', label: 'Texte long', icon: '¶', desc: 'Paragraphe', hint: 'Ex : commentaire, demande.' },
      { type: 'number', label: 'Nombre / quantité', icon: '🔢', desc: 'Saisie d’un chiffre', hint: 'Ex : âge, quantité de paquets.' },
      { type: 'date_choice', label: 'Date au choix', icon: '🗓️', desc: 'Le visiteur choisit une date', hint: 'Ex : date de naissance, date d’arrivée.' },
      { type: 'people_count', label: 'Nombre de personnes', icon: '👥', desc: 'Compteur 1 à N', hint: 'Sélection par bouton.' },
      { type: 'file', label: 'Fichier joint', icon: '📎', desc: 'Image ou PDF à téléverser', hint: 'Ex : justificatif, photo, document.' },
      { type: 'signature', label: 'Signature', icon: '✍️', desc: 'Signature manuscrite', hint: 'Ex : engagement, autorisation parentale.' },
    ],
  },
  {
    group: 'Paiement', emoji: '💰', note: 'Pour encaisser (carte Stripe)',
    types: [
      { type: 'payment', label: 'Montant fixe', icon: '◆', desc: 'Prix fixe à payer', hint: 'Vous fixez le montant (× nb de personnes si présent).' },
      { type: 'donation', label: 'Don libre', icon: '🤲', desc: 'Montants suggérés + libre', hint: 'Ex : 18, 36, 180 € + montant au choix.' },
      { type: 'table_reservation', label: 'Tables & places', icon: '🍽️', desc: 'Formules avec places et prix', hint: 'Ex : table complète, place seule — chacune son prix.' },
    ],
  },
  {
    group: 'Affichage', emoji: 'ℹ️', note: 'Informations — le visiteur ne remplit rien',
    types: [
      { type: 'event_date', label: 'Date & lieu', icon: '📅', desc: "Affiche la date de l'événement", hint: 'Choisie via le calendrier.' },
      { type: 'info_block', label: "Bloc d'information", icon: '✍', desc: 'Texte libre', hint: 'Ex : règles, tarifs, conditions.' },
    ],
  },
];
// Liste plate dérivée — pour les recherches existantes (addField, FieldEditor)
const FIELD_TYPES: FieldTypeDef[] = FIELD_GROUPS.flatMap((g) => g.types);

/* ─── Modèles de formulaires prêts à l'emploi ─────────────────── */
type TemplateField = Omit<FormField, 'id'>;
type FormTemplate = { key: string; name: string; icon: string; title: string; description: string; fields: TemplateField[] };

const TEMPLATES: FormTemplate[] = [
  {
    key: 'gala', name: 'Gala / Dîner', icon: '🍽️',
    title: 'Dîner de Gala', description: 'Réservez votre table pour notre soirée de gala.',
    fields: [
      { type: 'event_date', label: "Date de l'événement", presetValue: '' },
      { type: 'info_block', label: 'Informations', presetValue: 'Soirée de gala annuelle.\nTenue de soirée souhaitée.' },
      { type: 'table_reservation', label: 'Votre réservation', required: true, allowCash: false,
        tableOptions: [
          { label: 'Table complète', seats: 10, price: 1800 },
          { label: 'Demi-table', seats: 5, price: 950 },
          { label: 'Place individuelle', seats: 1, price: 200 },
        ] },
    ],
  },
  {
    key: 'fete', name: 'Inscription fête', icon: '🕯️',
    title: 'Inscription — Roch Hachana / Kippour', description: 'Réservez vos places pour les offices.',
    fields: [
      { type: 'event_date', label: "Date", presetValue: '' },
      { type: 'people_count', label: 'Nombre de places', maxPeople: 8, required: true },
      { type: 'info_block', label: 'Informations', presetValue: "Merci de réserver vos places à l'avance." },
      { type: 'payment', label: 'Participation', amount: 50, currency: 'eur', allowCash: true },
    ],
  },
  {
    key: 'chabbat', name: 'Repas de Chabbat', icon: '🍷',
    title: 'Repas de Chabbat', description: 'Inscrivez-vous à notre repas communautaire.',
    fields: [
      { type: 'event_date', label: 'Date', presetValue: '' },
      { type: 'people_count', label: 'Nombre de convives', maxPeople: 10, required: true },
      { type: 'radio', label: 'Choix du plat', required: true, options: [{ label: 'Viande' }, { label: 'Poisson' }, { label: 'Végétarien' }] },
      { type: 'payment', label: 'Participation aux frais', amount: 25, currency: 'eur', allowCash: true },
    ],
  },
  {
    key: 'don', name: 'Collecte de dons', icon: '🤲',
    title: 'Faire un don', description: 'Soutenez la communauté. Chaque don compte.',
    fields: [
      { type: 'donation', label: 'Votre don', required: true, suggestedAmounts: [18, 36, 180, 360], allowCustomAmount: true, allowCash: false },
    ],
  },
  {
    key: 'gratuit', name: 'Événement gratuit', icon: '✓',
    title: 'Inscription', description: 'Inscrivez-vous gratuitement à notre événement.',
    fields: [
      { type: 'event_date', label: 'Date', presetValue: '' },
      { type: 'people_count', label: 'Nombre de personnes', maxPeople: 6 },
      { type: 'checkbox', label: 'Je confirme ma présence', required: true },
    ],
  },
  {
    key: 'aliyot', name: 'Aliyot / Honneurs', icon: '📜',
    title: 'Réservation d\'honneurs', description: 'Réservez une montée à la Torah ou un honneur.',
    fields: [
      { type: 'event_date', label: 'Office concerné', presetValue: '' },
      { type: 'radio', label: 'Honneur souhaité', required: true, options: [{ label: 'Cohen' }, { label: 'Levi' }, { label: 'Chlichi' }, { label: 'Maftir' }, { label: 'Hagbaha' }, { label: 'Gelila' }] },
      { type: 'donation', label: 'Don associé (facultatif)', suggestedAmounts: [18, 36, 100], allowCustomAmount: true },
    ],
  },
  {
    key: 'loulav', name: 'Loulav & Etrog', icon: '🌿',
    title: 'Commande Loulav & Etrog', description: 'Commandez votre jeu des 4 espèces pour Souccot.',
    fields: [
      { type: 'radio', label: 'Formule', required: true, options: [{ label: 'Standard' }, { label: 'Mehoudar' }, { label: 'Hidour (premium)' }] },
      { type: 'people_count', label: 'Quantité', maxPeople: 5 },
      { type: 'payment', label: 'Règlement', amount: 60, currency: 'eur', allowCash: true },
    ],
  },
  {
    key: 'matsot', name: 'Vente de Matsot', icon: '🫓',
    title: 'Commande de Matsot Chmourot', description: 'Réservez vos matsot pour Pessah.',
    fields: [
      { type: 'people_count', label: 'Nombre de paquets', maxPeople: 10, required: true },
      { type: 'info_block', label: 'Infos', presetValue: 'Retrait à la communauté avant Pessah.' },
      { type: 'payment', label: 'Règlement', amount: 25, currency: 'eur', allowCash: true },
    ],
  },
  {
    key: 'manot', name: 'Mishloah Manot', icon: '🎁',
    title: 'Mishloah Manot — Pourim', description: 'Envoyez des paniers à vos proches via la communauté.',
    fields: [
      { type: 'textarea', label: 'Liste des destinataires', placeholder: 'Un nom par ligne…', required: true },
      { type: 'payment', label: 'Participation', amount: 10, currency: 'eur', allowCash: true },
    ],
  },
  {
    key: 'minyan', name: 'Minyan / Office', icon: '🙏',
    title: 'Inscription à l’office', description: 'Confirmez votre présence pour compléter le minyan.',
    fields: [
      { type: 'event_date', label: 'Office', presetValue: '' },
      { type: 'radio', label: 'Office', required: true, options: [{ label: "Cha'harit" }, { label: "Min'ha" }, { label: 'Arvit' }] },
      { type: 'checkbox', label: 'Je serai présent(e)', required: true },
    ],
  },
  {
    key: 'kaddish', name: 'Demande de Kaddish', icon: '🕯️',
    title: 'Demande de Kaddish', description: 'Demandez la récitation du Kaddish pour un proche.',
    fields: [
      { type: 'textarea', label: 'Nom du défunt (et nom hébraïque si connu)', required: true },
      { type: 'event_date', label: 'Période souhaitée', presetValue: '' },
      { type: 'donation', label: 'Don associé (facultatif)', suggestedAmounts: [18, 36, 100], allowCustomAmount: true },
    ],
  },
  {
    key: 'salle', name: 'Réservation salle / mikvé', icon: '🏛️',
    title: 'Réservation', description: 'Réservez un créneau pour la salle ou le mikvé.',
    fields: [
      { type: 'event_date', label: 'Date souhaitée', presetValue: '' },
      { type: 'radio', label: 'Espace', required: true, options: [{ label: 'Salle de réception' }, { label: 'Salle de cours' }, { label: 'Mikvé' }] },
      { type: 'textarea', label: 'Précisions (horaire, nombre de personnes…)' },
    ],
  },
  {
    key: 'simha', name: 'Brit / Bar-Bat Mitsva', icon: '🎉',
    title: "Annonce de Sim'ha", description: 'Partagez votre événement familial avec la communauté.',
    fields: [
      { type: 'radio', label: 'Type', required: true, options: [{ label: 'Brit Mila' }, { label: 'Bar Mitsva' }, { label: 'Bat Mitsva' }, { label: 'Mariage' }] },
      { type: 'event_date', label: 'Date', presetValue: '' },
      { type: 'textarea', label: 'Détails (lieu, horaire…)' },
      { type: 'people_count', label: 'Nombre d’invités', maxPeople: 20 },
    ],
  },
  {
    key: 'ecole', name: 'Inscription école', icon: '🎓',
    title: 'Inscription Talmud Torah', description: 'Inscrivez votre enfant aux cours.',
    fields: [
      { type: 'textarea', label: "Nom et prénom de l'enfant", required: true },
      { type: 'radio', label: 'Niveau', required: true, options: [{ label: 'Maternelle' }, { label: 'Primaire' }, { label: 'Collège' }, { label: 'Bar/Bat Mitsva' }] },
      { type: 'info_block', label: 'Infos', presetValue: 'Les cours ont lieu le dimanche matin.' },
      { type: 'payment', label: 'Frais de scolarité', amount: 200, currency: 'eur', allowCash: true },
    ],
  },
];

/* ─── Mini Calendar ─────────────────────────────────────────── */
const MONTHS_FR = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];
const DAYS_FR = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];
const WEEKDAYS_LONG = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche'];

function formatDateFR(date: Date): string {
  const dayIdx = date.getDay() === 0 ? 6 : date.getDay() - 1;
  const weekday = WEEKDAYS_LONG[dayIdx];
  const day = date.getDate();
  const month = MONTHS_FR[date.getMonth()].toLowerCase();
  const year = date.getFullYear();
  return `${weekday.charAt(0).toUpperCase() + weekday.slice(1)} ${day} ${month} ${year}`;
}

function MiniCalendar({ value, onChange }: { value?: string; onChange: (text: string) => void }) {
  const [open, setOpen] = useState(false);
  const [viewDate, setViewDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const adjustedFirstDay = firstDay === 0 ? 6 : firstDay - 1;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const today = new Date();

  const selectDate = (day: number) => {
    const date = new Date(year, month, day);
    setSelectedDate(date);
    onChange(formatDateFR(date));
    setOpen(false);
  };

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full text-left px-3 py-2.5 rounded-xl bg-gold-400/10 border border-gold-400/30 text-brown-900 text-sm flex items-center justify-between gap-2 hover:border-gold-500/50 transition-colors"
      >
        <span className={value ? 'text-brown-900 font-medium' : 'text-brown-400'}>{value || 'Choisir une date…'}</span>
        <span className="text-gold-500 text-base">{open ? '▲' : '📅'}</span>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="mt-2 bg-beige-50 border border-gold-400/30 rounded-2xl p-4">
              {/* Month nav */}
              <div className="flex items-center justify-between mb-3">
                <button
                  type="button"
                  onClick={() => setViewDate(new Date(year, month - 1, 1))}
                  className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-beige-200 text-brown-600 transition-colors font-bold"
                >
                  ‹
                </button>
                <span className="text-sm font-semibold text-brown-900" style={{ fontFamily: 'var(--font-cormorant)', fontSize: '1rem' }}>
                  {MONTHS_FR[month]} {year}
                </span>
                <button
                  type="button"
                  onClick={() => setViewDate(new Date(year, month + 1, 1))}
                  className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-beige-200 text-brown-600 transition-colors font-bold"
                >
                  ›
                </button>
              </div>

              {/* Day names */}
              <div className="grid grid-cols-7 mb-1">
                {DAYS_FR.map((d, i) => (
                  <div key={i} className="text-center text-[10px] text-brown-400 font-semibold py-1 uppercase tracking-wide">
                    {d}
                  </div>
                ))}
              </div>

              {/* Days grid */}
              <div className="grid grid-cols-7 gap-0.5">
                {Array(adjustedFirstDay).fill(null).map((_, i) => <div key={`e-${i}`} />)}
                {Array(daysInMonth).fill(null).map((_, i) => {
                  const day = i + 1;
                  const isToday = year === today.getFullYear() && month === today.getMonth() && day === today.getDate();
                  const isSelected = selectedDate &&
                    year === selectedDate.getFullYear() &&
                    month === selectedDate.getMonth() &&
                    day === selectedDate.getDate();
                  return (
                    <button
                      key={day}
                      type="button"
                      onClick={() => selectDate(day)}
                      className={`h-8 w-full rounded-lg text-xs font-medium transition-all hover:scale-105 ${
                        isSelected
                          ? 'bg-gold-500 text-white shadow-sm shadow-gold-500/30'
                          : isToday
                          ? 'bg-gold-400/20 text-gold-700 font-bold ring-1 ring-gold-400/40'
                          : 'text-brown-700 hover:bg-beige-200'
                      }`}
                    >
                      {day}
                    </button>
                  );
                })}
              </div>

              {value && (
                <button
                  type="button"
                  onClick={() => { onChange(''); setSelectedDate(null); setOpen(false); }}
                  className="mt-3 w-full text-xs text-brown-400 hover:text-brown-600 py-1 transition-colors"
                >
                  Effacer la date
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ─── Image Picker ─────────────────────────────────────────── */
function ImagePicker({
  value,
  onChange,
  label,
  compact = false,
  onToast,
}: {
  value?: string;
  onChange: (url?: string) => void;
  label?: string;
  compact?: boolean;
  onToast?: (msg: string, type: 'success' | 'error') => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = ''; // reset input

    setUploading(true);
    try {
      // 1. Compression côté client (réduit la taille avant upload)
      const maxPx = compact ? 600 : 1200;
      const blob = await compressImage(file, maxPx);

      // 2. Upload vers /api/upload → Supabase Storage
      const fd = new FormData();
      fd.append('file', blob, 'image.jpg');

      const res = await fetch('/api/upload', { method: 'POST', body: fd });
      const data: { url?: string; error?: string } = await res.json();

      if (!res.ok || !data.url) {
        throw new Error(data.error ?? "L'upload a échoué");
      }

      // 3. L'URL publique est rattachée à l'objet
      onChange(data.url);
      onToast?.('Image sauvegardée avec succès', 'success');
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erreur lors de l'upload";
      onToast?.(msg, 'error');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div>
      {label && (
        <label className="block text-xs text-brown-500 uppercase tracking-wide font-medium mb-1.5">
          {label}
        </label>
      )}
      <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />

      {value ? (
        <div className={`relative rounded-xl overflow-hidden border border-beige-200 ${compact ? 'h-20' : 'h-36'}`}>
          <Image src={value} alt="" fill className="object-cover" unoptimized />
          <div className="absolute inset-0 bg-gradient-to-t from-brown-900/40 to-transparent" />
          {/* Spinner d'upload superposé */}
          {uploading && (
            <div className="absolute inset-0 flex items-center justify-center bg-brown-900/50 backdrop-blur-sm">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
                className="w-6 h-6 border-2 border-white border-t-transparent rounded-full"
              />
            </div>
          )}
          {!uploading && (
            <div className="absolute bottom-2 right-2 flex gap-1.5">
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-brown-900/70 text-white text-xs hover:bg-brown-700/80 transition-colors"
              >
                📷 Changer
              </button>
              <button
                type="button"
                onClick={() => onChange(undefined)}
                aria-label="Retirer l'image"
                className="w-6 h-6 rounded-lg bg-red-600/80 text-white text-xs flex items-center justify-center hover:bg-red-600 transition-colors"
              >
                ×
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          <button
            type="button"
            onClick={() => !uploading && fileRef.current?.click()}
            disabled={uploading}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border-2 border-dashed border-beige-300 text-brown-400 text-sm hover:border-gold-400/50 hover:text-gold-600 hover:bg-gold-400/5 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {uploading ? (
              <>
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
                  className="w-4 h-4 border-2 border-gold-400 border-t-transparent rounded-full"
                />
                <span>Upload en cours…</span>
              </>
            ) : (
              <>📷 Ajouter une image</>
            )}
          </button>
          {!uploading && (
            <input
              className="w-full px-3 py-2 rounded-xl bg-beige-100 border border-beige-200 text-brown-700 text-xs focus:outline-none focus:border-gold-400 transition-colors"
              placeholder="Ou coller une URL…"
              onBlur={(e) => { if (e.target.value) onChange(e.target.value); }}
            />
          )}
        </div>
      )}
    </div>
  );
}

/* ─── Option Editor ────────────────────────────────────────── */
function OptionEditor({
  option,
  onChange,
  onDelete,
  onToast,
}: {
  option: FieldOption;
  onChange: (o: FieldOption) => void;
  onDelete: () => void;
  onToast?: (msg: string, type: 'success' | 'error') => void;
}) {
  return (
    <div className="p-3 rounded-xl bg-beige-100 border border-beige-200 space-y-2">
      <div className="flex gap-2 items-center">
        <input
          className="flex-1 px-3 py-2 rounded-lg bg-beige-50 border border-beige-200 text-sm text-brown-900 focus:outline-none focus:border-gold-400"
          placeholder="Label de l'option"
          value={option.label}
          onChange={(e) => onChange({ ...option, label: e.target.value })}
        />
        <button
          onClick={onDelete}
          aria-label="Supprimer l'option"
          className="w-8 h-8 flex items-center justify-center rounded-lg text-brown-300 hover:text-red-400 hover:bg-red-50 transition-colors text-lg leading-none flex-shrink-0"
        >
          ×
        </button>
      </div>
      <ImagePicker
        value={option.imageUrl}
        onChange={(url) => onChange({ ...option, imageUrl: url })}
        compact
        onToast={onToast}
      />
    </div>
  );
}

/* ─── Field Editor ─────────────────────────────────────────── */
function FieldEditor({
  field,
  onChange,
  onDelete,
  onMoveUp,
  onMoveDown,
  onDuplicate,
  isFirst,
  isLast,
  autoOpen = false,
  onToast,
}: {
  field: FormField;
  onChange: (f: FormField) => void;
  onDelete: () => void;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  onDuplicate?: () => void;
  isFirst?: boolean;
  isLast?: boolean;
  autoOpen?: boolean;
  onToast?: (msg: string, type: 'success' | 'error') => void;
}) {
  const [open, setOpen] = useState(autoOpen);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (autoOpen) {
      const timer = setTimeout(() => {
        ref.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 200);
      return () => clearTimeout(timer);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toggle = () => {
    const next = !open;
    setOpen(next);
    if (next) {
      setTimeout(() => ref.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 120);
    }
  };

  const addOption = () => {
    onChange({
      ...field,
      options: [...(field.options ?? []), { label: `Option ${(field.options?.length ?? 0) + 1}` }],
    });
  };

  const ft = FIELD_TYPES.find((f) => f.type === field.type);

  return (
    <motion.div
      ref={ref}
      data-field-id={field.id}
      layout
      initial={{ opacity: 0, y: 20, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, x: -40, scale: 0.95 }}
      transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
      className="bg-beige-50 border border-beige-200 rounded-2xl overflow-hidden hover:border-gold-400/40 transition-colors"
    >
      <div
        className="flex items-center gap-3 px-5 py-4 cursor-pointer select-none"
        onClick={toggle}
      >
        <div className="w-7 h-7 rounded-lg bg-gold-400/10 border border-gold-400/20 flex items-center justify-center text-gold-600 text-sm font-bold flex-shrink-0">
          {ft?.icon ?? 'F'}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-brown-900 truncate">{field.label || 'Champ sans titre'}</p>
          <p className="text-xs text-brown-400">{ft?.label ?? field.type}</p>
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          {field.required && (
            <span className="hidden sm:inline text-xs px-2 py-0.5 rounded-full bg-gold-400/10 text-gold-600 border border-gold-400/20">
              Requis
            </span>
          )}
          {field.imageUrl && <span className="text-xs text-brown-300">🖼</span>}
          <button
            onClick={(e) => { e.stopPropagation(); onMoveUp?.(); }}
            disabled={isFirst}
            className="w-7 h-7 rounded-lg text-brown-400 hover:text-brown-800 hover:bg-beige-100 transition-colors disabled:opacity-25 disabled:cursor-not-allowed text-xs"
            title="Monter" aria-label="Monter le champ"
          >▲</button>
          <button
            onClick={(e) => { e.stopPropagation(); onMoveDown?.(); }}
            disabled={isLast}
            className="w-7 h-7 rounded-lg text-brown-400 hover:text-brown-800 hover:bg-beige-100 transition-colors disabled:opacity-25 disabled:cursor-not-allowed text-xs"
            title="Descendre" aria-label="Descendre le champ"
          >▼</button>
          <button
            onClick={(e) => { e.stopPropagation(); onDuplicate?.(); }}
            className="w-7 h-7 rounded-lg text-brown-400 hover:text-gold-600 hover:bg-beige-100 transition-colors text-xs"
            title="Dupliquer" aria-label="Dupliquer le champ"
          >⧉</button>
          <motion.span animate={{ rotate: open ? 180 : 0 }} className="text-brown-400 text-xs ml-0.5">▾</motion.span>
        </div>
      </div>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden border-t border-beige-200"
          >
            <div className="p-5 space-y-4">
              {/* Label */}
              <div>
                <label className="text-xs text-brown-500 uppercase tracking-wide font-medium">Libellé</label>
                <input
                  className="mt-1 w-full px-3 py-2.5 rounded-xl bg-beige-100 border border-beige-200 text-brown-900 text-sm focus:outline-none focus:border-gold-400 transition-colors"
                  value={field.label}
                  onChange={(e) => onChange({ ...field, label: e.target.value })}
                  placeholder="Ex: Quel est votre prénom ?"
                />
              </div>

              {/* Description */}
              {field.type !== 'payment' && (
                <div>
                  <label className="text-xs text-brown-500 uppercase tracking-wide font-medium">
                    Description (optionnel)
                  </label>
                  <input
                    className="mt-1 w-full px-3 py-2.5 rounded-xl bg-beige-100 border border-beige-200 text-brown-700 text-sm focus:outline-none focus:border-gold-400 transition-colors"
                    value={field.description ?? ''}
                    onChange={(e) => onChange({ ...field, description: e.target.value || undefined })}
                    placeholder="Sous-titre ou aide"
                  />
                </div>
              )}

              {/* EVENT DATE — calendar picker + lieu */}
              {field.type === 'event_date' && (
                <div className="space-y-3">
                  <div>
                    <label className="text-xs text-brown-500 uppercase tracking-wide font-medium mb-1.5 block">
                      Date de l&apos;événement
                    </label>
                    <MiniCalendar
                      value={field.presetValue}
                      onChange={(text) => onChange({ ...field, presetValue: text })}
                    />
                    <p className="mt-1.5 text-[11px] text-brown-400">Ou saisissez manuellement :</p>
                    <input
                      className="mt-1 w-full px-3 py-2.5 rounded-xl bg-beige-100 border border-beige-200 text-brown-900 text-sm focus:outline-none focus:border-gold-400 transition-colors"
                      value={field.presetValue ?? ''}
                      onChange={(e) => onChange({ ...field, presetValue: e.target.value })}
                      placeholder="Ex: Samedi 14 juin 2025 — 20h00"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-brown-500 uppercase tracking-wide font-medium mb-1.5 block">
                      Lieu
                    </label>
                    <input
                      className="w-full px-3 py-2.5 rounded-xl bg-beige-100 border border-beige-200 text-brown-900 text-sm focus:outline-none focus:border-gold-400 transition-colors"
                      value={field.venue ?? ''}
                      onChange={(e) => onChange({ ...field, venue: e.target.value || undefined })}
                      placeholder="Ex: Salle Yaguel Yaakov, Lyon 6e"
                    />
                  </div>
                </div>
              )}

              {/* INFO BLOCK */}
              {field.type === 'info_block' && (
                <div>
                  <label className="text-xs text-brown-500 uppercase tracking-wide font-medium">Contenu du bloc</label>
                  <textarea
                    className="mt-1 w-full px-3 py-2.5 rounded-xl bg-beige-100 border border-beige-200 text-brown-800 text-sm focus:outline-none focus:border-gold-400 transition-colors resize-none"
                    rows={4}
                    value={field.presetValue ?? ''}
                    onChange={(e) => onChange({ ...field, presetValue: e.target.value })}
                    placeholder="Message informatif affiché aux participants…"
                  />
                </div>
              )}

              {/* PEOPLE COUNT max */}
              {field.type === 'people_count' && (
                <div>
                  <label className="text-xs text-brown-500 uppercase tracking-wide font-medium">Nombre max de personnes</label>
                  <input
                    type="number"
                    min="1"
                    max="20"
                    className="mt-1 w-full px-3 py-2.5 rounded-xl bg-beige-100 border border-beige-200 text-brown-900 text-sm focus:outline-none focus:border-gold-400 transition-colors"
                    value={field.maxPeople ?? 8}
                    onChange={(e) => onChange({ ...field, maxPeople: parseInt(e.target.value) || 8 })}
                  />
                </div>
              )}

              {/* PAYMENT amount + cash toggle */}
              {field.type === 'payment' && (
                <div className="space-y-4">
                  <div>
                    <label className="text-xs text-brown-500 uppercase tracking-wide font-medium">Montant (€)</label>
                    <input
                      type="number"
                      min="1"
                      step="1"
                      className="mt-1 w-full px-3 py-2.5 rounded-xl bg-beige-100 border border-beige-200 text-brown-900 text-sm focus:outline-none focus:border-gold-400 transition-colors"
                      value={field.amount ?? ''}
                      onChange={(e) => {
                        const val = e.target.value;
                        onChange({ ...field, amount: val === '' ? undefined : parseFloat(val) });
                      }}
                      placeholder="50"
                    />
                    <p className="mt-1 text-[11px] text-brown-400">Montant en euros entiers (ex: 30, 50, 80)</p>
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-xl bg-beige-100 border border-beige-200">
                    <div>
                      <p className="text-xs font-semibold text-brown-800">Paiement en espèces</p>
                      <p className="text-[11px] text-brown-400 mt-0.5">Autoriser le paiement sur place (cash)</p>
                    </div>
                    <div
                      className={`relative w-9 h-5 rounded-full transition-colors cursor-pointer flex-shrink-0 ${field.allowCash ? 'bg-gold-500' : 'bg-beige-300'}`}
                      onClick={() => onChange({ ...field, allowCash: !field.allowCash })}
                    >
                      <motion.div
                        className="absolute top-0.5 w-4 h-4 bg-white rounded-full shadow-sm"
                        animate={{ left: field.allowCash ? '18px' : '2px' }}
                        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* TABLE RESERVATION (Gala) — formules + cash */}
              {field.type === 'table_reservation' && (
                <div className="space-y-4">
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <label className="text-xs text-brown-500 uppercase tracking-wide font-medium">Formules (table / place)</label>
                      <button
                        onClick={() =>
                          onChange({
                            ...field,
                            tableOptions: [...(field.tableOptions ?? []), { label: 'Nouvelle formule', seats: 1, price: 100 }],
                          })
                        }
                        className="text-xs text-gold-600 hover:text-gold-500 font-medium flex items-center gap-1 px-3 py-1.5 rounded-lg hover:bg-gold-400/10 transition-colors"
                      >
                        + Ajouter
                      </button>
                    </div>
                    <div className="space-y-3">
                      {(field.tableOptions ?? []).map((opt, i) => (
                        <div key={i} className="p-3 rounded-xl bg-beige-100 border border-beige-200 space-y-2">
                          <div className="flex items-center gap-2">
                            <input
                              className="flex-1 px-3 py-2 rounded-lg bg-beige-50 border border-beige-200 text-brown-900 text-sm focus:outline-none focus:border-gold-400 transition-colors"
                              value={opt.label}
                              placeholder="Ex : Table Or — 10 places"
                              onChange={(e) => {
                                const next = [...(field.tableOptions ?? [])];
                                next[i] = { ...opt, label: e.target.value };
                                onChange({ ...field, tableOptions: next });
                              }}
                            />
                            <button
                              onClick={() => onChange({ ...field, tableOptions: (field.tableOptions ?? []).filter((_, idx) => idx !== i) })}
                              className="text-brown-400 hover:text-red-500 transition-colors px-2 py-1 rounded-lg hover:bg-red-50 text-sm"
                              aria-label="Supprimer la formule"
                            >×</button>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="flex-1">
                              <label className="text-[11px] text-brown-400">Places</label>
                              <input
                                type="number" min="1"
                                className="mt-0.5 w-full px-3 py-2 rounded-lg bg-beige-50 border border-beige-200 text-brown-900 text-sm focus:outline-none focus:border-gold-400 transition-colors"
                                value={opt.seats}
                                onChange={(e) => {
                                  const next = [...(field.tableOptions ?? [])];
                                  next[i] = { ...opt, seats: parseInt(e.target.value) || 1 };
                                  onChange({ ...field, tableOptions: next });
                                }}
                              />
                            </div>
                            <div className="flex-1">
                              <label className="text-[11px] text-brown-400">Prix (€)</label>
                              <input
                                type="number" min="0"
                                className="mt-0.5 w-full px-3 py-2 rounded-lg bg-beige-50 border border-beige-200 text-brown-900 text-sm focus:outline-none focus:border-gold-400 transition-colors"
                                value={opt.price}
                                onChange={(e) => {
                                  const next = [...(field.tableOptions ?? [])];
                                  next[i] = { ...opt, price: parseFloat(e.target.value) || 0 };
                                  onChange({ ...field, tableOptions: next });
                                }}
                              />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-xl bg-beige-100 border border-beige-200">
                    <div>
                      <p className="text-xs font-semibold text-brown-800">Paiement en espèces</p>
                      <p className="text-[11px] text-brown-400 mt-0.5">Autoriser le paiement sur place (cash)</p>
                    </div>
                    <div
                      className={`relative w-9 h-5 rounded-full transition-colors cursor-pointer flex-shrink-0 ${field.allowCash ? 'bg-gold-500' : 'bg-beige-300'}`}
                      onClick={() => onChange({ ...field, allowCash: !field.allowCash })}
                    >
                      <motion.div
                        className="absolute top-0.5 w-4 h-4 bg-white rounded-full shadow-sm"
                        animate={{ left: field.allowCash ? '18px' : '2px' }}
                        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* DONATION — montants suggérés + don libre + cash */}
              {field.type === 'donation' && (
                <div className="space-y-4">
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <label className="text-xs text-brown-500 uppercase tracking-wide font-medium">Montants suggérés (€)</label>
                      <button
                        onClick={() => onChange({ ...field, suggestedAmounts: [...(field.suggestedAmounts ?? []), 50] })}
                        className="text-xs text-gold-600 hover:text-gold-500 font-medium flex items-center gap-1 px-3 py-1.5 rounded-lg hover:bg-gold-400/10 transition-colors"
                      >
                        + Ajouter
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {(field.suggestedAmounts ?? []).map((amt, i) => (
                        <div key={i} className="flex items-center gap-1 bg-beige-100 border border-beige-200 rounded-lg pl-2 pr-1 py-1">
                          <input
                            type="number" min="1"
                            className="w-16 bg-transparent text-brown-900 text-sm focus:outline-none"
                            value={amt}
                            onChange={(e) => {
                              const next = [...(field.suggestedAmounts ?? [])];
                              next[i] = parseFloat(e.target.value) || 0;
                              onChange({ ...field, suggestedAmounts: next });
                            }}
                          />
                          <span className="text-brown-400 text-xs">€</span>
                          <button
                            onClick={() => onChange({ ...field, suggestedAmounts: (field.suggestedAmounts ?? []).filter((_, idx) => idx !== i) })}
                            className="text-brown-400 hover:text-red-500 transition-colors px-1 text-sm"
                            aria-label="Supprimer le montant"
                          >×</button>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-xl bg-beige-100 border border-beige-200">
                    <div>
                      <p className="text-xs font-semibold text-brown-800">Montant libre</p>
                      <p className="text-[11px] text-brown-400 mt-0.5">Le donateur peut saisir son propre montant</p>
                    </div>
                    <div
                      className={`relative w-9 h-5 rounded-full transition-colors cursor-pointer flex-shrink-0 ${field.allowCustomAmount ? 'bg-gold-500' : 'bg-beige-300'}`}
                      onClick={() => onChange({ ...field, allowCustomAmount: !field.allowCustomAmount })}
                    >
                      <motion.div
                        className="absolute top-0.5 w-4 h-4 bg-white rounded-full shadow-sm"
                        animate={{ left: field.allowCustomAmount ? '18px' : '2px' }}
                        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                      />
                    </div>
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-xl bg-beige-100 border border-beige-200">
                    <div>
                      <p className="text-xs font-semibold text-brown-800">Paiement en espèces</p>
                      <p className="text-[11px] text-brown-400 mt-0.5">Autoriser le don sur place (cash)</p>
                    </div>
                    <div
                      className={`relative w-9 h-5 rounded-full transition-colors cursor-pointer flex-shrink-0 ${field.allowCash ? 'bg-gold-500' : 'bg-beige-300'}`}
                      onClick={() => onChange({ ...field, allowCash: !field.allowCash })}
                    >
                      <motion.div
                        className="absolute top-0.5 w-4 h-4 bg-white rounded-full shadow-sm"
                        animate={{ left: field.allowCash ? '18px' : '2px' }}
                        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Field image */}
              {field.type !== 'payment' && field.type !== 'table_reservation' && field.type !== 'donation' && field.type !== 'checkbox' && field.type !== 'event_date' && field.type !== 'people_count' && (
                <ImagePicker
                  label="Image au-dessus de la question"
                  value={field.imageUrl}
                  onChange={(url) => onChange({ ...field, imageUrl: url })}
                  onToast={onToast}
                />
              )}

              {/* Placeholder (texte court, long, nombre) */}
              {(field.type === 'textarea' || field.type === 'text' || field.type === 'number') && (
                <div>
                  <label className="text-xs text-brown-500 uppercase tracking-wide font-medium">Exemple affiché (placeholder)</label>
                  <input
                    className="mt-1 w-full px-3 py-2.5 rounded-xl bg-beige-100 border border-beige-200 text-brown-900 text-sm focus:outline-none focus:border-gold-400 transition-colors"
                    value={field.placeholder ?? ''}
                    onChange={(e) => onChange({ ...field, placeholder: e.target.value })}
                    placeholder={field.type === 'number' ? 'Ex: 3' : 'Ex: Votre réponse ici…'}
                  />
                </div>
              )}

              {/* Case à cocher : texte affiché à côté de la case */}
              {field.type === 'checkbox' && (
                <>
                  <div>
                    <label className="text-xs text-brown-500 uppercase tracking-wide font-medium">Texte de la case</label>
                    <input
                      className="mt-1 w-full px-3 py-2.5 rounded-xl bg-beige-100 border border-beige-200 text-brown-900 text-sm focus:outline-none focus:border-gold-400 transition-colors"
                      value={field.placeholder ?? ''}
                      onChange={(e) => onChange({ ...field, placeholder: e.target.value })}
                      placeholder="Ex: J'accepte les conditions"
                    />
                  </div>
                  <label className="flex items-center gap-2 text-sm text-brown-700 cursor-pointer">
                    <div className={`relative w-9 h-5 rounded-full transition-colors ${field.defaultChecked ? 'bg-gold-500' : 'bg-beige-300'}`}
                      onClick={() => onChange({ ...field, defaultChecked: !field.defaultChecked })}>
                      <motion.div className="absolute top-0.5 w-4 h-4 bg-white rounded-full shadow-sm" animate={{ left: field.defaultChecked ? '18px' : '2px' }} transition={{ type: 'spring', stiffness: 500, damping: 30 }} />
                    </div>
                    Cochée par défaut
                  </label>
                </>
              )}

              {/* Options avancées — Nombre : min / max / unité */}
              {field.type === 'number' && (
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="text-xs text-brown-500 uppercase tracking-wide font-medium">Min</label>
                    <input type="number" className="mt-1 w-full px-3 py-2.5 rounded-xl bg-beige-100 border border-beige-200 text-brown-900 text-sm focus:outline-none focus:border-gold-400"
                      value={field.min ?? ''} onChange={(e) => onChange({ ...field, min: e.target.value === '' ? undefined : Number(e.target.value) })} placeholder="0" />
                  </div>
                  <div>
                    <label className="text-xs text-brown-500 uppercase tracking-wide font-medium">Max</label>
                    <input type="number" className="mt-1 w-full px-3 py-2.5 rounded-xl bg-beige-100 border border-beige-200 text-brown-900 text-sm focus:outline-none focus:border-gold-400"
                      value={field.max ?? ''} onChange={(e) => onChange({ ...field, max: e.target.value === '' ? undefined : Number(e.target.value) })} placeholder="—" />
                  </div>
                  <div>
                    <label className="text-xs text-brown-500 uppercase tracking-wide font-medium">Unité</label>
                    <input className="mt-1 w-full px-3 py-2.5 rounded-xl bg-beige-100 border border-beige-200 text-brown-900 text-sm focus:outline-none focus:border-gold-400"
                      value={field.unit ?? ''} onChange={(e) => onChange({ ...field, unit: e.target.value || undefined })} placeholder="ans, kg…" />
                  </div>
                </div>
              )}

              {/* Options avancées — Texte : limite de caractères */}
              {(field.type === 'text' || field.type === 'textarea') && (
                <div>
                  <label className="text-xs text-brown-500 uppercase tracking-wide font-medium">Limite de caractères <span className="normal-case text-brown-300">(optionnel)</span></label>
                  <input type="number" min="1" className="mt-1 w-full px-3 py-2.5 rounded-xl bg-beige-100 border border-beige-200 text-brown-900 text-sm focus:outline-none focus:border-gold-400"
                    value={field.maxLength ?? ''} onChange={(e) => onChange({ ...field, maxLength: e.target.value === '' ? undefined : Number(e.target.value) })} placeholder="Ex: 200" />
                </div>
              )}

              {/* Options avancées — Date au choix : restriction */}
              {field.type === 'date_choice' && (
                <div>
                  <label className="text-xs text-brown-500 uppercase tracking-wide font-medium mb-1.5 block">Dates autorisées</label>
                  <div className="flex gap-2">
                    {([['', 'Toutes'], ['past', 'Passé only'], ['future', 'Futur only']] as const).map(([v, lbl]) => (
                      <button key={lbl} type="button" onClick={() => onChange({ ...field, dateMode: (v || undefined) as 'past' | 'future' | undefined })}
                        className={`flex-1 py-2 rounded-lg text-xs font-medium border transition-colors ${(field.dateMode ?? '') === v ? 'bg-brown-900 text-beige-50 border-brown-900' : 'bg-beige-50 text-brown-600 border-beige-200 hover:border-gold-400/50'}`}>
                        {lbl}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Options avancées — Nombre de personnes : minimum */}
              {field.type === 'people_count' && (
                <div>
                  <label className="text-xs text-brown-500 uppercase tracking-wide font-medium">Minimum de personnes</label>
                  <input type="number" min="1" className="mt-1 w-full px-3 py-2.5 rounded-xl bg-beige-100 border border-beige-200 text-brown-900 text-sm focus:outline-none focus:border-gold-400"
                    value={field.minPeople ?? ''} onChange={(e) => onChange({ ...field, minPeople: e.target.value === '' ? undefined : Number(e.target.value) })} placeholder="1" />
                </div>
              )}

              {/* Options (select / radio) */}
              {(field.type === 'select' || field.type === 'radio') && (
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <label className="text-xs text-brown-500 uppercase tracking-wide font-medium">Options</label>
                    <button
                      onClick={addOption}
                      className="text-xs text-gold-600 hover:text-gold-500 font-medium flex items-center gap-1 px-3 py-1.5 rounded-lg hover:bg-gold-400/10 transition-colors"
                    >
                      + Ajouter
                    </button>
                  </div>
                  <div className="space-y-3">
                    {(field.options ?? []).map((opt, i) => (
                      <OptionEditor
                        key={i}
                        option={opt}
                        onChange={(updated) => {
                          const newOpts = [...(field.options ?? [])];
                          newOpts[i] = updated;
                          onChange({ ...field, options: newOpts });
                        }}
                        onDelete={() => {
                          onChange({ ...field, options: (field.options ?? []).filter((_, idx) => idx !== i) });
                        }}
                        onToast={onToast}
                      />
                    ))}
                  </div>

                  {/* Choix par convive (#39) */}
                  <label className="flex items-start gap-2.5 mt-4 text-sm text-brown-700 select-none cursor-pointer">
                    <div
                      className={`relative w-9 h-5 rounded-full transition-colors flex-shrink-0 mt-0.5 ${field.perGuest ? 'bg-gold-500' : 'bg-beige-300'}`}
                      onClick={() => onChange({ ...field, perGuest: !field.perGuest })}
                    >
                      <motion.div
                        className="absolute top-0.5 w-4 h-4 bg-white rounded-full shadow-sm"
                        animate={{ left: field.perGuest ? '18px' : '2px' }}
                        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                      />
                    </div>
                    <span>
                      Demander pour <strong>chaque convive</strong>
                      <span className="block text-xs text-brown-400 mt-0.5">À placer après le champ « nombre de places / convives » ou la réservation de table.</span>
                    </span>
                  </label>

                  {/* Liste déroulante (#35) */}
                  <label className="flex items-start gap-2.5 mt-3 text-sm text-brown-700 select-none cursor-pointer">
                    <div className={`relative w-9 h-5 rounded-full transition-colors flex-shrink-0 mt-0.5 ${field.dropdown ? 'bg-gold-500' : 'bg-beige-300'}`}
                      onClick={() => onChange({ ...field, dropdown: !field.dropdown })}>
                      <motion.div className="absolute top-0.5 w-4 h-4 bg-white rounded-full shadow-sm" animate={{ left: field.dropdown ? '18px' : '2px' }} transition={{ type: 'spring', stiffness: 500, damping: 30 }} />
                    </div>
                    <span>Afficher en <strong>liste déroulante</strong><span className="block text-xs text-brown-400 mt-0.5">Pratique pour les longues listes.</span></span>
                  </label>
                </div>
              )}

              {/* Required + Delete */}
              <div className="flex items-center justify-between pt-1">
                {field.type !== 'event_date' && field.type !== 'info_block' && (
                  <label className="flex items-center gap-2 text-sm text-brown-700 select-none cursor-pointer">
                    <div
                      className={`relative w-9 h-5 rounded-full transition-colors ${field.required ? 'bg-gold-500' : 'bg-beige-300'}`}
                      onClick={() => onChange({ ...field, required: !field.required })}
                    >
                      <motion.div
                        className="absolute top-0.5 w-4 h-4 bg-white rounded-full shadow-sm"
                        animate={{ left: field.required ? '18px' : '2px' }}
                        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                      />
                    </div>
                    Obligatoire
                  </label>
                )}
                <div className="ml-auto">
                  <button
                    onClick={onDelete}
                    className="text-xs text-brown-400 hover:text-red-500 transition-colors px-3 py-1.5 rounded-lg hover:bg-red-50"
                  >
                    Supprimer
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

/* ─── AI Modal ─────────────────────────────────────────────── */
function AIModal({
  onClose,
  onGenerate,
}: {
  onClose: () => void;
  onGenerate: (title: string, desc: string, fields: FormField[]) => void;
}) {
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const generate = async () => {
    if (!prompt.trim()) return;
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/ai-form', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description: prompt }),
      });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error ?? 'Erreur serveur');

      const fields: FormField[] = (data.fields ?? []).map((f: Partial<FormField>) => ({
        id: generateId(),
        type: f.type ?? 'text',
        label: f.label ?? 'Champ',
        description: f.description,
        placeholder: f.placeholder,
        required: f.required ?? false,
        options: f.options,
        amount: f.amount,
        currency: f.type === 'payment' ? 'eur' : undefined,
        presetValue: f.presetValue,
      }));

      onGenerate(data.title ?? 'Formulaire', data.description ?? '', fields);
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur inconnue');
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-brown-900/50 backdrop-blur-sm"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        className="w-full max-w-lg bg-beige-50 rounded-3xl overflow-hidden shadow-2xl"
        initial={{ y: '100%', opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: '100%', opacity: 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      >
        <div className="relative p-6 pb-0">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-gold-400 to-gold-300" />
          <div className="flex items-start justify-between mb-4">
            <div>
              <h2
                className="text-2xl font-light text-brown-900"
                style={{ fontFamily: 'var(--font-cormorant)' }}
              >
                ✦ Créer avec l&apos;IA
              </h2>
              <p className="text-sm text-brown-400 mt-1">
                Décrivez votre événement, l&apos;IA génère le formulaire.
              </p>
            </div>
            <button onClick={onClose} aria-label="Fermer" className="text-brown-300 hover:text-brown-700 text-2xl leading-none p-1">
              ×
            </button>
          </div>
        </div>

        <div className="p-6 space-y-4">
          <textarea
            className="w-full px-4 py-3 rounded-2xl bg-beige-100 border border-beige-200 text-brown-900 text-sm focus:outline-none focus:border-gold-400 transition-colors resize-none"
            rows={5}
            placeholder="Ex: Formulaire d'inscription pour un dîner de Roch Hachana le 22 septembre. Collecter noms, emails, téléphones, régimes alimentaires et paiement de 80€ par personne."
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            autoFocus
          />

          {error && (
            <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-sm text-red-500 px-1">
              ⚠ {error}
            </motion.p>
          )}

          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 py-3 rounded-xl border border-beige-300 text-brown-600 text-sm font-medium hover:bg-beige-100 transition-colors"
            >
              Annuler
            </button>
            <motion.button
              onClick={generate}
              disabled={loading || !prompt.trim()}
              className="flex-1 py-3 rounded-xl bg-brown-900 text-beige-50 text-sm font-medium disabled:opacity-40"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.97 }}
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <motion.span
                    animate={{ rotate: 360 }}
                    transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
                    className="inline-block w-4 h-4 border-2 border-beige-400 border-t-transparent rounded-full"
                  />
                  Génération…
                </span>
              ) : (
                '✦ Générer'
              )}
            </motion.button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

/* ─── Builder Content ──────────────────────────────────────── */
/* ─── Assistant guidé (création simplifiée) ─────────────────────
   3 questions max → le formulaire est généré automatiquement.
   Le builder avancé reste accessible via « Personnaliser ». */
function QuickWizard({ onCreate, onAdvanced, saving }: {
  onCreate: (data: { template: FormTemplate; title: string; date: string; price: string; capacity: string }) => void;
  onAdvanced: (template: FormTemplate | null, data: { title: string; date: string; price: string; capacity: string }) => void;
  saving: boolean;
}) {
  const [tpl, setTpl] = useState<FormTemplate | null>(null);
  const [title, setTitle] = useState('');
  const [date, setDate] = useState('');
  const [price, setPrice] = useState('');
  const [capacity, setCapacity] = useState('');

  // On met en avant les 6 cas les plus courants
  const featured = ['gala', 'fete', 'chabbat', 'don', 'gratuit', 'aliyot'];
  const cards = featured.map((k) => TEMPLATES.find((t) => t.key === k)).filter(Boolean) as FormTemplate[];

  const choose = (t: FormTemplate) => {
    setTpl(t); setTitle(t.title);
    const pay = t.fields.find((f) => f.type === 'payment');
    setPrice(pay?.amount ? String(pay.amount) : '');
    setDate(''); setCapacity('');
  };

  const hasDate = !!tpl?.fields.some((f) => f.type === 'event_date');
  const hasPrice = !!tpl?.fields.some((f) => f.type === 'payment');
  const canCreate = !!tpl && title.trim() !== '';

  return (
    <div className="min-h-screen pt-24 pb-20">
      <div className="max-w-2xl mx-auto px-5 sm:px-6">
        <div className="text-center mb-10">
          <p className="text-xs uppercase tracking-widest text-gold-600 mb-2">Création guidée</p>
          <h1 className="text-4xl sm:text-5xl font-light text-brown-900" style={{ fontFamily: 'var(--font-cormorant)' }}>
            {tpl ? 'Quelques infos' : 'Que voulez-vous créer ?'}
          </h1>
          <p className="text-brown-500 text-sm mt-2">
            {tpl ? 'On s’occupe du reste — vous pourrez tout modifier ensuite.' : 'Choisissez un type, le formulaire est prêt en 30 secondes.'}
          </p>
        </div>

        {!tpl ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {cards.map((t) => (
              <motion.button key={t.key} onClick={() => choose(t)}
                whileHover={{ y: -3 }} whileTap={{ scale: 0.98 }}
                className="flex items-center gap-4 p-5 rounded-2xl bg-beige-50 border border-beige-200 text-left hover:border-gold-400/50 transition-colors">
                <span className="text-3xl flex-shrink-0">{t.icon}</span>
                <div className="min-w-0">
                  <p className="font-medium text-brown-900">{t.name}</p>
                  <p className="text-xs text-brown-400 truncate">{t.description}</p>
                </div>
              </motion.button>
            ))}
          </div>
        ) : (
          <div className="rounded-3xl bg-beige-50 border border-beige-200 shadow-[0_20px_60px_rgba(44,24,16,0.06)] p-6 sm:p-8 space-y-6">
            <button onClick={() => setTpl(null)} className="text-xs text-brown-400 hover:text-brown-700 transition-colors">← Changer de type</button>

            <div>
              <label className="text-xs text-brown-400 uppercase tracking-wide mb-2 block font-medium">Titre du formulaire</label>
              <input value={title} onChange={(e) => setTitle(e.target.value)}
                className="w-full px-4 py-3.5 rounded-xl bg-beige-100 border border-beige-200 text-brown-900 focus:outline-none focus:border-gold-400"
                placeholder="Ex : Grand Gala 2026" />
            </div>

            {hasDate && (
              <div>
                <label className="text-xs text-brown-400 uppercase tracking-wide mb-2 block font-medium">Date de l’événement</label>
                <MiniCalendar value={date} onChange={setDate} />
              </div>
            )}

            {hasPrice && (
              <div>
                <label className="text-xs text-brown-400 uppercase tracking-wide mb-2 block font-medium">Prix par personne (€)</label>
                <input type="number" min="0" value={price} onChange={(e) => setPrice(e.target.value)}
                  className="w-full px-4 py-3.5 rounded-xl bg-beige-100 border border-beige-200 text-brown-900 focus:outline-none focus:border-gold-400"
                  placeholder="Ex : 50" />
              </div>
            )}

            <div>
              <label className="text-xs text-brown-400 uppercase tracking-wide mb-2 block font-medium">
                Nombre de places max <span className="normal-case text-brown-300">(optionnel)</span>
              </label>
              <input type="number" min="1" value={capacity} onChange={(e) => setCapacity(e.target.value)}
                className="w-full px-4 py-3.5 rounded-xl bg-beige-100 border border-beige-200 text-brown-900 focus:outline-none focus:border-gold-400"
                placeholder="Laisser vide = illimité" />
            </div>

            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <motion.button onClick={() => onCreate({ template: tpl, title, date, price, capacity })}
                disabled={!canCreate || saving} whileTap={{ scale: 0.98 }}
                className="btn-liquid flex-1 py-4 bg-brown-900 text-beige-50 rounded-2xl font-medium overflow-hidden disabled:opacity-40">
                <span className="relative z-10">{saving ? 'Création…' : '✓ Créer le formulaire'}</span>
              </motion.button>
              <button onClick={() => onAdvanced(tpl, { title, date, price, capacity })}
                className="px-5 py-4 rounded-2xl border border-beige-300 text-brown-600 text-sm hover:bg-beige-100 transition-colors">
                Personnaliser en détail
              </button>
            </div>
          </div>
        )}

        {!tpl && (
          <div className="text-center mt-8">
            <button onClick={() => onAdvanced(null, { title: '', date: '', price: '', capacity: '' })}
              className="text-sm text-brown-400 hover:text-brown-700 underline underline-offset-2 transition-colors">
              Ou créer un formulaire vierge (mode avancé)
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── Aperçu en direct du formulaire (lecture seule) ───────────── */
function FormPreview({ title, description, fields, onClose }: {
  title: string; description: string; fields: FormField[]; onClose: () => void;
}) {
  const pill = 'px-4 py-3 rounded-xl bg-beige-100 border border-beige-200 text-brown-400 text-sm';
  return (
    <motion.div className="fixed inset-0 z-[200] flex items-center justify-center px-4 bg-brown-900/50 backdrop-blur-sm"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
      <motion.div className="w-full max-w-md max-h-[88vh] overflow-y-auto bg-beige-50 rounded-3xl border border-beige-200 shadow-2xl"
        initial={{ scale: 0.96, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.96, y: 20 }}
        onClick={(e) => e.stopPropagation()}>
        <div className="sticky top-0 bg-beige-50/95 backdrop-blur-md border-b border-beige-200 px-5 py-3 flex items-center justify-between z-10">
          <span className="text-xs uppercase tracking-widest text-gold-600">👁 Aperçu visiteur</span>
          <button onClick={onClose} aria-label="Fermer" className="text-brown-400 hover:text-brown-700 text-xl leading-none">×</button>
        </div>
        <div className="p-6 space-y-6">
          <div>
            <h2 className="text-2xl font-light text-brown-900" style={{ fontFamily: 'var(--font-cormorant)' }}>{title || 'Titre du formulaire'}</h2>
            {description && <p className="text-brown-400 text-sm mt-1">{description}</p>}
          </div>
          {/* Identité (toujours demandée) */}
          <div className="space-y-2.5">
            <p className="text-xs font-semibold text-brown-800">👤 Vos coordonnées</p>
            <div className={pill}>Civilité · Prénom · Nom</div>
            <div className={pill}>Email</div>
            <div className={pill}>Téléphone</div>
          </div>
          {fields.length > 0 && <div className="border-t border-beige-200" />}
          {fields.map((f) => (
            <div key={f.id}>
              {f.type === 'event_date' ? (
                <div className="p-4 rounded-2xl bg-beige-100 border border-gold-400/20 text-center">
                  <p className="text-2xl mb-1">📅</p>
                  <p className="text-brown-800 font-medium">{f.presetValue || "Date de l'événement"}</p>
                  {f.venue && <p className="text-xs text-brown-400 mt-1">📍 {f.venue}</p>}
                </div>
              ) : f.type === 'info_block' ? (
                <div className="p-4 rounded-2xl bg-beige-100 border-l-4 border-gold-400">
                  <p className="text-brown-700 text-sm whitespace-pre-line">{f.presetValue || 'Texte d’information…'}</p>
                </div>
              ) : (
                <div>
                  <p className="text-sm font-medium text-brown-900 mb-2">{f.label}{f.required && <span className="text-gold-500 ml-1">*</span>}</p>
                  {f.type === 'people_count' && <div className="flex gap-2">{[1, 2, 3].map((n) => <span key={n} className="w-12 h-12 rounded-xl border-2 border-beige-200 bg-beige-50 flex items-center justify-center text-brown-500">{n}</span>)}<span className="text-brown-300 self-center">…</span></div>}
                  {f.type === 'donation' && <div className="flex flex-wrap gap-2">{(f.suggestedAmounts ?? [18, 36, 180]).map((a) => <span key={a} className="px-5 py-3 rounded-2xl border-2 border-beige-200 bg-beige-50 text-brown-600">{a} €</span>)}</div>}
                  {f.type === 'table_reservation' && <div className="space-y-2">{(f.tableOptions ?? []).map((o, i) => <div key={i} className="px-4 py-3 rounded-xl border-2 border-beige-200 bg-beige-50 flex justify-between"><span className="text-brown-700 text-sm">{o.label}</span><span className="text-brown-500 text-sm">{o.seats} pl · {o.price} €</span></div>)}</div>}
                  {(f.type === 'radio' || f.type === 'select') && <div className="grid grid-cols-2 gap-2">{(f.options ?? []).map((o) => <span key={o.label} className="px-4 py-2.5 rounded-xl border-2 border-beige-200 bg-beige-50 text-brown-600 text-sm">{o.label}</span>)}</div>}
                  {f.type === 'checkbox' && <div className="flex items-center gap-2"><span className="w-6 h-6 rounded-md border-2 border-beige-300" /><span className="text-brown-600 text-sm">{f.placeholder || 'Je confirme'}</span></div>}
                  {(f.type === 'text' || f.type === 'number') && <div className={pill}>{f.placeholder || 'Réponse courte…'}</div>}
                  {f.type === 'date_choice' && <div className={pill}>📅 jj / mm / aaaa</div>}
                  {f.type === 'textarea' && <div className={`${pill} h-20`}>{f.placeholder || 'Réponse longue…'}</div>}
                  {f.type === 'payment' && <div className="px-4 py-3 rounded-xl bg-gold-400/10 border border-gold-400/20 text-gold-700 text-sm">◆ {f.amount ?? 0} € · paiement carte</div>}
                </div>
              )}
            </div>
          ))}
          <button className="w-full py-3.5 bg-brown-900 text-beige-50 rounded-2xl font-medium opacity-90">Valider mon inscription →</button>
          <p className="text-center text-[11px] text-brown-300">Ceci est un aperçu — les boutons ne sont pas actifs.</p>
        </div>
      </motion.div>
    </motion.div>
  );
}

function BuilderContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Initialise depuis ?id= au premier rendu (lazy initializer — pas d'effect)
  const [formId, setFormId] = useState<string | null>(() => {
    const id = searchParams.get('id');
    return id && getForm(id) ? id : null;
  });
  const [title, setTitle] = useState(() => {
    const id = searchParams.get('id');
    return id ? (getForm(id)?.title ?? 'Mon formulaire') : 'Mon formulaire';
  });
  const [description, setDescription] = useState(() => {
    const id = searchParams.get('id');
    return id ? (getForm(id)?.description ?? '') : '';
  });
  const [coverImage, setCoverImage] = useState<string | undefined>(() => {
    const id = searchParams.get('id');
    return id ? getForm(id)?.coverImage : undefined;
  });
  const [youtubeUrl, setYoutubeUrl] = useState<string>(() => {
    const id = searchParams.get('id');
    return id ? (getForm(id)?.youtubeUrl ?? '') : '';
  });
  const [fields, setFields] = useState<FormField[]>(() => {
    const id = searchParams.get('id');
    return id ? (getForm(id)?.fields ?? []) : [];
  });
  const [promoCodes, setPromoCodes] = useState<PromoCode[]>(() => {
    const id = searchParams.get('id');
    return id ? (getForm(id)?.promoCodes ?? []) : [];
  });
  const [maxCapacity, setMaxCapacity] = useState<string>(() => {
    const id = searchParams.get('id');
    const c = id ? getForm(id)?.maxCapacity : undefined;
    return c != null ? String(c) : '';
  });
  const [saving, setSaving] = useState(false);
  const [justAddedId, setJustAddedId] = useState<string | null>(null);
  const [showMobilePanel, setShowMobilePanel] = useState(false);
  const [showAI, setShowAI] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  // Mode création : assistant guidé par défaut pour un nouveau formulaire
  const [mode, setMode] = useState<'wizard' | 'advanced'>(() => (searchParams.get('id') ? 'advanced' : 'wizard'));

  // Construit les champs à partir d'un modèle + des réponses de l'assistant
  const buildWizardFields = (t: FormTemplate, date: string, price: string): FormField[] =>
    t.fields.map((f) => {
      const nf = { ...f, id: generateId() } as FormField;
      if (f.type === 'event_date' && date) nf.presetValue = date;
      if (f.type === 'payment' && price.trim() !== '') nf.amount = parseFloat(price) || f.amount;
      return nf;
    });

  // Système de notifications toast
  const { toasts, toast: addToast } = useToast();

  const isEditing = !!formId;

  // Clear justAddedId after scroll
  useEffect(() => {
    if (justAddedId) {
      const t = setTimeout(() => setJustAddedId(null), 700);
      return () => clearTimeout(t);
    }
  }, [justAddedId]);

  const addField = useCallback(
    (type: FieldType) => {
      const newField: FormField = {
        id: generateId(),
        type,
        label: FIELD_TYPES.find((f) => f.type === type)?.label ?? 'Nouveau champ',
        required: false,
        ...(type === 'select' || type === 'radio'
          ? { options: [{ label: 'Option 1' }, { label: 'Option 2' }, { label: 'Option 3' }] as FieldOption[] }
          : {}),
        ...(type === 'payment' ? { amount: 50, currency: 'eur' } : {}),
        ...(type === 'event_date' ? { presetValue: '' } : {}),
        ...(type === 'people_count' ? { maxPeople: 8 } : {}),
        ...(type === 'table_reservation'
          ? {
              tableOptions: [
                { label: 'Table complète', seats: 10, price: 1800 },
                { label: 'Place individuelle', seats: 1, price: 180 },
              ],
              allowCash: false,
            }
          : {}),
        ...(type === 'donation'
          ? { suggestedAmounts: [18, 36, 180], allowCustomAmount: true, allowCash: false }
          : {}),
        ...(type === 'info_block'
          ? { presetValue: 'Si vous souhaitez faire un don, vous pouvez verser le montant de votre choix.\n\nMerci 🙏' }
          : {}),
      };

      setFields((prev) => [...prev, newField]);
      setJustAddedId(newField.id);
      setShowMobilePanel(false);
    },
    []
  );

  const doSave = async (): Promise<Form> => {
    setSaving(true);
    try {
      const existing = formId ? getForm(formId) : null;
      const capacity = maxCapacity.trim() === '' ? undefined : (parseInt(maxCapacity, 10) || undefined);
      let form: Form;
      if (existing) {
        form = { ...existing, title, description, coverImage, youtubeUrl: youtubeUrl || undefined, fields, promoCodes, maxCapacity: capacity, updatedAt: new Date().toISOString() };
      } else {
        form = createForm(title);
        form.description = description;
        form.coverImage = coverImage;
        form.youtubeUrl = youtubeUrl || undefined;
        form.fields = fields;
        form.promoCodes = promoCodes;
        form.maxCapacity = capacity;
        setFormId(form.id);
      }
      // 1. Sauvegarde locale immédiate (synchrone)
      saveFormLocally(form);
      // 2. Synchronisation serveur (attend la confirmation DB)
      try {
        await saveFormToServer(form);
      } catch (serverErr) {
        const msg = serverErr instanceof Error ? serverErr.message : 'Erreur de sauvegarde serveur.';
        addToast(msg, 'error');
        // On continue : le formulaire est déjà sauvegardé localement
      }
      return form;
    } finally {
      setSaving(false);
    }
  };

  const handleSave = async () => {
    await doSave();
    router.push('/dashboard?created=1');
  };

  const handlePublish = async () => {
    const form = await doSave();
    router.push(`/forms/${form.id}`);
  };

  const handleAIGenerate = (aiTitle: string, aiDesc: string, aiFields: FormField[]) => {
    setTitle(aiTitle);
    setDescription(aiDesc);
    setFields(aiFields);
  };

  const applyTemplate = (t: FormTemplate) => {
    setTitle(t.title);
    setDescription(t.description);
    setFields(t.fields.map((f) => ({ ...f, id: generateId() }) as FormField));
    setShowTemplates(false);
    addToast(`Modèle « ${t.name} » appliqué`, 'success');
  };

  // Assistant guidé → création directe (sans passer par le builder avancé)
  const handleWizardCreate = async (data: { template: FormTemplate; title: string; date: string; price: string; capacity: string }) => {
    setSaving(true);
    try {
      const form = createForm(data.title.trim() || data.template.title);
      form.description = data.template.description;
      form.fields = buildWizardFields(data.template, data.date, data.price);
      form.maxCapacity = data.capacity.trim() === '' ? undefined : (parseInt(data.capacity, 10) || undefined);
      saveFormLocally(form);
      try { await saveFormToServer(form); } catch { addToast('Sauvegardé localement (erreur serveur).', 'error'); }
      router.push('/dashboard?created=1');
    } finally {
      setSaving(false);
    }
  };

  // Assistant guidé → bascule vers le builder avancé (pré-rempli)
  const handleWizardAdvanced = (t: FormTemplate | null, data: { title: string; date: string; price: string; capacity: string }) => {
    if (t) {
      setTitle(data.title.trim() || t.title);
      setDescription(t.description);
      setFields(buildWizardFields(t, data.date, data.price));
      if (data.capacity.trim() !== '') setMaxCapacity(data.capacity);
    }
    setMode('advanced');
  };

  const fieldTypePanel = (
    <div className="space-y-5">
      {FIELD_GROUPS.map((g) => (
        <div key={g.group}>
          <div className="flex items-baseline gap-2 mb-2 px-1">
            <span className="text-sm font-semibold text-brown-800">{g.emoji} {g.group}</span>
            <span className="text-[10px] text-brown-400">· {g.note}</span>
          </div>
          <div className="space-y-1.5">
            {g.types.map((ft) => (
              <motion.button
                key={ft.type}
                onClick={() => addField(ft.type)}
                className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl bg-beige-50 border border-beige-200 text-left transition-all group hover:border-gold-400/50 hover:bg-gold-400/5"
                whileHover={{ x: 2 }}
                whileTap={{ scale: 0.98 }}
                title={ft.hint}
              >
                <span className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm flex-shrink-0 transition-colors ${
                  g.group === 'Paiement'
                    ? 'bg-gold-400/20 text-gold-600 border border-gold-400/30'
                    : 'bg-beige-200 text-brown-600 border border-beige-300 group-hover:bg-gold-400/10 group-hover:border-gold-400/20'
                }`}>
                  {ft.icon}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-brown-800 leading-tight">{ft.label}</p>
                  <p className="text-[11px] text-brown-400 leading-tight">{ft.desc}</p>
                </div>
                <span className="text-gold-400 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 text-lg">+</span>
              </motion.button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );

  const saveLabel = isEditing ? 'Sauvegarder ✓' : 'Créer le formulaire ✓';
  const saveLabelShort = isEditing ? 'Sauvegarder' : 'Créer ✓';

  // Mode assistant guidé (création simplifiée) — par défaut pour un nouveau formulaire
  if (mode === 'wizard') {
    return (
      <>
        <Toaster toasts={toasts} />
        <QuickWizard onCreate={handleWizardCreate} onAdvanced={handleWizardAdvanced} saving={saving} />
      </>
    );
  }

  return (
    <>
      {/* Notifications toast — z-300, top de l'écran */}
      <Toaster toasts={toasts} />

      <AnimatePresence>
        {showAI && (
          <AIModal
            onClose={() => setShowAI(false)}
            onGenerate={handleAIGenerate}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showPreview && (
          <FormPreview title={title} description={description} fields={fields} onClose={() => setShowPreview(false)} />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showTemplates && (
          <motion.div
            className="fixed inset-0 z-[200] flex items-center justify-center px-4 bg-brown-900/40 backdrop-blur-sm"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setShowTemplates(false)}
          >
            <motion.div
              className="w-full max-w-lg bg-beige-50 rounded-3xl border border-beige-200 p-6 shadow-2xl"
              initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-1">
                <h3 className="text-2xl font-light text-brown-900" style={{ fontFamily: 'var(--font-cormorant)' }}>Partir d&apos;un modèle</h3>
                <button onClick={() => setShowTemplates(false)} aria-label="Fermer" className="text-brown-400 hover:text-brown-700 text-xl leading-none">×</button>
              </div>
              <p className="text-xs text-brown-400 mb-5">Le modèle remplace le contenu actuel du formulaire.</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {TEMPLATES.map((t) => (
                  <button key={t.key} onClick={() => applyTemplate(t)}
                    className="text-left p-4 rounded-2xl border border-beige-200 bg-beige-100 hover:border-gold-400/50 hover:bg-gold-400/5 transition-colors">
                    <div className="text-2xl mb-1">{t.icon}</div>
                    <p className="font-medium text-brown-900 text-sm">{t.name}</p>
                    <p className="text-[11px] text-brown-400 mt-0.5 line-clamp-2">{t.description}</p>
                  </button>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="min-h-screen pt-16 pb-28 lg:pb-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 lg:py-12">
          {/* Header */}
          <motion.div
            className="mb-8 lg:mb-10 flex items-start justify-between gap-4"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <div>
              <h1
                className="text-4xl lg:text-5xl font-light text-brown-900 mb-2"
                style={{ fontFamily: 'var(--font-cormorant)' }}
              >
                <em className="gradient-text">{isEditing ? 'Modifier' : 'Créer'}</em> votre formulaire
              </h1>
              <p className="text-brown-500 text-sm">Une question à la fois. Une expérience inoubliable.</p>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0 mt-1">
              <motion.button
                onClick={() => setShowPreview(true)}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-brown-900 text-beige-50 text-sm font-medium hover:bg-brown-800 transition-colors"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.97 }}
              >
                👁 Aperçu
              </motion.button>
              <motion.button
                onClick={() => setShowTemplates(true)}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-beige-100 border border-beige-200 text-brown-700 text-sm font-medium hover:border-gold-400/40 transition-colors"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.97 }}
              >
                ◳ Modèles
              </motion.button>
              <motion.button
                onClick={() => setShowAI(true)}
                className="hidden sm:flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gold-400/10 border border-gold-400/30 text-gold-700 text-sm font-medium hover:bg-gold-400/20 transition-colors"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.97 }}
              >
                ✦ IA
              </motion.button>
            </div>
          </motion.div>

          <div className="grid lg:grid-cols-[300px_1fr] gap-6 lg:gap-8">
            {/* LEFT: Field palette */}
            <motion.aside
              className="hidden lg:block"
              initial={{ opacity: 0, x: -30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
            >
              <div className="p-5 rounded-3xl bg-beige-100 border border-beige-200 sticky top-24">
                <h2
                  className="text-base font-medium text-brown-900 mb-4"
                  style={{ fontFamily: 'var(--font-cormorant)' }}
                >
                  Types de champs
                </h2>
                {fieldTypePanel}
              </div>
            </motion.aside>

            {/* RIGHT: Editor */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="space-y-5"
            >
              {/* Form settings */}
              <div className="relative p-6 lg:p-8 rounded-3xl bg-beige-50 border border-beige-200 overflow-hidden">
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-gold-400 to-gold-300" />
                <h2 className="text-xs text-brown-500 uppercase tracking-widest mb-5 font-medium">
                  Paramètres généraux
                </h2>
                <div className="space-y-4">
                  <div>
                    <label className="text-xs text-brown-500 uppercase tracking-wide font-medium">Titre</label>
                    <input
                      className="mt-1 w-full px-4 py-3 rounded-xl bg-beige-100 border border-beige-200 text-brown-900 focus:outline-none focus:border-gold-400 transition-colors"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="Ex: Réservation VIP"
                      style={{ fontFamily: 'var(--font-cormorant)', fontSize: '1.25rem' }}
                    />
                  </div>
                  <div>
                    <label className="text-xs text-brown-500 uppercase tracking-wide font-medium">
                      Description (optionnel)
                    </label>
                    <textarea
                      className="mt-1 w-full px-4 py-3 rounded-xl bg-beige-100 border border-beige-200 text-brown-700 text-sm focus:outline-none focus:border-gold-400 transition-colors resize-none"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      rows={2}
                      placeholder="Un texte d'introduction pour vos visiteurs…"
                    />
                  </div>
                  <ImagePicker
                    label="Image de couverture — affichée plein écran au départ"
                    value={coverImage}
                    onChange={setCoverImage}
                    onToast={addToast}
                  />

                  {/* Musique d'ambiance YouTube */}
                  <div>
                    <label className="text-xs text-brown-500 uppercase tracking-wide font-medium">
                      Musique d&apos;ambiance (YouTube)
                    </label>
                    <div className="mt-1 relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm select-none">🎵</span>
                      <input
                        className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-beige-100 border border-beige-200 text-brown-700 text-sm focus:outline-none focus:border-gold-400 transition-colors"
                        value={youtubeUrl}
                        onChange={(e) => setYoutubeUrl(e.target.value)}
                        placeholder="https://www.youtube.com/watch?v=..."
                      />
                    </div>
                    {youtubeUrl && !extractYouTubeId(youtubeUrl) && (
                      <p className="mt-1 text-[11px] text-red-400">⚠ URL YouTube non reconnue</p>
                    )}
                    {youtubeUrl && extractYouTubeId(youtubeUrl) && (
                      <p className="mt-1 text-[11px] text-green-600">✓ Musique configurée</p>
                    )}
                  </div>

                  {/* Capacité maximale */}
                  <div>
                    <label className="text-xs text-brown-500 uppercase tracking-wide font-medium">
                      Capacité maximale 👥
                    </label>
                    <input
                      type="number" min="1"
                      className="mt-1 w-full px-3 py-2.5 rounded-xl bg-beige-100 border border-beige-200 text-brown-900 text-sm focus:outline-none focus:border-gold-400 transition-colors"
                      value={maxCapacity}
                      onChange={(e) => setMaxCapacity(e.target.value)}
                      placeholder="Ex : 120 (laisser vide = illimité)"
                    />
                    <p className="mt-1 text-[11px] text-brown-400">
                      Quand le nombre de places est atteint, l&apos;événement passe en liste d&apos;attente (sans paiement).
                    </p>
                  </div>

                  {/* Codes promo */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-xs text-brown-500 uppercase tracking-wide font-medium">
                        Codes promo 🏷
                      </label>
                      <button
                        type="button"
                        onClick={() => setPromoCodes((prev) => [...prev, { code: '', type: 'percent', discount: 10 }])}
                        className="text-xs text-gold-600 hover:text-gold-500 font-medium px-3 py-1.5 rounded-lg hover:bg-gold-400/10 transition-colors"
                      >
                        + Ajouter
                      </button>
                    </div>
                    {promoCodes.length === 0 && (
                      <p className="text-[11px] text-brown-400">Aucun code promo. Cliquez sur + Ajouter pour en créer un.</p>
                    )}
                    <div className="space-y-2">
                      {promoCodes.map((pc, i) => (
                        <div key={i} className="p-3 rounded-xl bg-beige-100 border border-beige-200 space-y-2">
                          <div className="flex gap-2">
                            <input
                              className="flex-1 px-3 py-2 rounded-lg bg-beige-50 border border-beige-200 text-sm text-brown-900 uppercase tracking-widest focus:outline-none focus:border-gold-400"
                              placeholder="CODE"
                              value={pc.code}
                              onChange={(e) => setPromoCodes((prev) => prev.map((p, idx) => idx === i ? { ...p, code: e.target.value.toUpperCase() } : p))}
                            />
                            <select
                              className="px-2 py-2 rounded-lg bg-beige-50 border border-beige-200 text-sm text-brown-700 focus:outline-none focus:border-gold-400"
                              value={pc.type}
                              onChange={(e) => setPromoCodes((prev) => prev.map((p, idx) => idx === i ? { ...p, type: e.target.value as 'percent' | 'fixed' } : p))}
                            >
                              <option value="percent">%</option>
                              <option value="fixed">€ fixe</option>
                            </select>
                            <input
                              type="number"
                              min="1"
                              className="w-16 px-2 py-2 rounded-lg bg-beige-50 border border-beige-200 text-sm text-brown-900 focus:outline-none focus:border-gold-400"
                              value={pc.discount}
                              onChange={(e) => setPromoCodes((prev) => prev.map((p, idx) => idx === i ? { ...p, discount: parseFloat(e.target.value) || 0 } : p))}
                            />
                            <button
                              type="button"
                              onClick={() => setPromoCodes((prev) => prev.filter((_, idx) => idx !== i))}
                              aria-label="Supprimer le code promo"
                              className="w-8 h-8 flex items-center justify-center rounded-lg text-brown-300 hover:text-red-400 hover:bg-red-50 transition-colors text-lg"
                            >
                              ×
                            </button>
                          </div>
                          <div className="flex items-center gap-2">
                            <label className="text-[11px] text-brown-400 whitespace-nowrap">Expire le</label>
                            <input
                              type="date"
                              className="flex-1 px-3 py-1.5 rounded-lg bg-beige-50 border border-beige-200 text-xs text-brown-700 focus:outline-none focus:border-gold-400"
                              value={pc.expiresAt ?? ''}
                              onChange={(e) => setPromoCodes((prev) => prev.map((p, idx) => idx === i ? { ...p, expiresAt: e.target.value || undefined } : p))}
                            />
                            <label className="text-[11px] text-brown-400 whitespace-nowrap">Max util.</label>
                            <input
                              type="number" min="1"
                              className="w-20 px-3 py-1.5 rounded-lg bg-beige-50 border border-beige-200 text-xs text-brown-700 focus:outline-none focus:border-gold-400"
                              placeholder="∞"
                              value={pc.maxUses ?? ''}
                              onChange={(e) => setPromoCodes((prev) => prev.map((p, idx) => idx === i ? { ...p, maxUses: e.target.value === '' ? undefined : Number(e.target.value) } : p))}
                            />
                          </div>
                          {pc.code && (
                            <p className="text-[11px] text-brown-400">
                              Code <span className="font-mono font-bold text-brown-700">{pc.code}</span> → {pc.type === 'percent' ? `${pc.discount}% de réduction` : `${pc.discount}€ de réduction`}
                              {pc.expiresAt ? ` · jusqu'au ${pc.expiresAt}` : ''}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Fields list */}
              <div className="p-6 lg:p-8 rounded-3xl bg-beige-50 border border-beige-200 min-h-[200px]">
                <div className="flex items-center justify-between mb-5">
                  <h2 className="text-xs text-brown-500 uppercase tracking-widest font-medium">
                    Questions ({fields.length})
                  </h2>
                </div>

                <AnimatePresence mode="popLayout">
                  {fields.length === 0 ? (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="flex flex-col items-center justify-center py-12 text-center rounded-2xl border-2 border-dashed border-beige-300"
                    >
                      <div className="text-5xl text-beige-300 mb-4 float-1">◈</div>
                      <p className="text-brown-700 text-sm font-medium">Ajoutez votre premier champ</p>
                      <p className="text-brown-300 text-xs mt-1 max-w-xs">
                        Civilité, prénom, nom, email et téléphone sont <strong>déjà demandés automatiquement</strong>. Ajoutez ici vos questions ou un paiement.
                      </p>
                      <div className="flex flex-wrap items-center justify-center gap-2 mt-5">
                        <button onClick={() => setShowMobilePanel(true)}
                          className="lg:hidden px-4 py-2.5 rounded-xl bg-brown-900 text-beige-50 text-sm font-medium">+ Ajouter un champ</button>
                        <span className="hidden lg:inline text-xs text-brown-400">← Choisissez un champ dans le panneau de gauche</span>
                        <button onClick={() => setShowTemplates(true)}
                          className="px-4 py-2.5 rounded-xl border border-beige-300 text-brown-600 text-sm hover:bg-beige-100 transition-colors">◳ Partir d&apos;un modèle</button>
                      </div>
                    </motion.div>
                  ) : (
                    <Reorder.Group axis="y" values={fields} onReorder={setFields} className="space-y-3">
                      {fields.map((field, idx) => (
                        <Reorder.Item key={field.id} value={field} className="list-none">
                          <FieldEditor
                            field={field}
                            autoOpen={justAddedId === field.id}
                            isFirst={idx === 0}
                            isLast={idx === fields.length - 1}
                            onMoveUp={() => setFields((prev) => {
                              if (idx <= 0) return prev;
                              const n = [...prev]; [n[idx - 1], n[idx]] = [n[idx], n[idx - 1]]; return n;
                            })}
                            onMoveDown={() => setFields((prev) => {
                              if (idx >= prev.length - 1) return prev;
                              const n = [...prev]; [n[idx + 1], n[idx]] = [n[idx], n[idx + 1]]; return n;
                            })}
                            onChange={(updated) =>
                              setFields((prev) => prev.map((f) => (f.id === updated.id ? updated : f)))
                            }
                            onDelete={() => setFields((prev) => prev.filter((f) => f.id !== field.id))}
                            onDuplicate={() => setFields((prev) => {
                              const copy = { ...field, id: generateId(), label: `${field.label} (copie)` } as FormField;
                              const n = [...prev]; n.splice(idx + 1, 0, copy); return n;
                            })}
                            onToast={addToast}
                          />
                        </Reorder.Item>
                      ))}
                    </Reorder.Group>
                  )}
                </AnimatePresence>
              </div>

              {/* Desktop actions */}
              <div className="hidden lg:flex items-center justify-between gap-4">
                <p className="text-xs text-brown-400">
                  {fields.length} question{fields.length !== 1 ? 's' : ''} · Glissez pour réorganiser
                </p>
                <div className="flex gap-3">
                  <motion.button
                    onClick={handlePublish}
                    disabled={saving}
                    className="px-6 py-3 rounded-xl gold-border text-brown-800 text-sm font-medium disabled:opacity-50"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.97 }}
                  >
                    {saving ? 'Chargement…' : 'Voir le formulaire →'}
                  </motion.button>

                  <motion.button
                    onClick={handleSave}
                    disabled={saving}
                    className="btn-liquid px-6 py-3 bg-brown-900 text-beige-50 rounded-xl text-sm font-medium overflow-hidden disabled:opacity-40"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.97 }}
                  >
                    <span className="relative z-10">{saving ? 'Sauvegarde…' : saveLabel}</span>
                  </motion.button>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </div>

      {/* Mobile: sticky bottom bar */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-beige-50/95 backdrop-blur-sm border-t border-beige-200 px-4 py-3">
        <div className="flex gap-3">
          <motion.button
            onClick={handlePublish}
            disabled={saving}
            className="flex-1 py-3 rounded-xl border border-beige-300 text-brown-700 text-sm font-medium disabled:opacity-50"
            whileTap={{ scale: 0.97 }}
          >
            {saving ? 'Chargement…' : 'Voir →'}
          </motion.button>
          <motion.button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 py-3 bg-brown-900 text-beige-50 rounded-xl text-sm font-medium disabled:opacity-40"
            whileTap={{ scale: 0.97 }}
          >
            {saving ? '…' : saveLabelShort}
          </motion.button>
        </div>
      </div>

      {/* Mobile: floating "+" button */}
      <AnimatePresence>
        {!showMobilePanel && (
          <motion.button
            className="lg:hidden fixed bottom-20 right-4 z-40 w-14 h-14 rounded-full bg-brown-900 text-beige-50 text-2xl shadow-xl flex items-center justify-center"
            onClick={() => setShowMobilePanel(true)}
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            whileHover={{ scale: 1.08 }}
            whileTap={{ scale: 0.92 }}
          >
            +
          </motion.button>
        )}
      </AnimatePresence>

      {/* Mobile: bottom sheet */}
      <AnimatePresence>
        {showMobilePanel && (
          <>
            <motion.div
              className="lg:hidden fixed inset-0 z-40 bg-brown-900/30 backdrop-blur-sm"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowMobilePanel(false)}
            />
            <motion.div
              className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-beige-50 rounded-t-3xl shadow-2xl overflow-y-auto"
              style={{ maxHeight: '80vh' }}
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            >
              <div className="p-5">
                <div className="flex items-center justify-between mb-4">
                  <h2
                    className="text-lg font-medium text-brown-900"
                    style={{ fontFamily: 'var(--font-cormorant)' }}
                  >
                    Ajouter un champ
                  </h2>
                  <button
                    onClick={() => setShowMobilePanel(false)}
                    aria-label="Fermer"
                    className="text-brown-300 text-2xl leading-none w-8 h-8 flex items-center justify-center"
                  >
                    ×
                  </button>
                </div>
                {fieldTypePanel}
                <div className="h-6" />
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}

export default function BuilderPage() {
  return (
    <Suspense>
      <BuilderContent />
    </Suspense>
  );
}
