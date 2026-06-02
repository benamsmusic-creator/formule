export type FieldType =
  | 'text'
  | 'email'
  | 'phone'
  | 'textarea'
  | 'select'
  | 'checkbox'
  | 'radio'
  | 'event_date'
  | 'people_count'
  | 'info_block'
  | 'number'
  | 'date_choice'
  | 'file'
  | 'signature'
  | 'table_reservation'
  | 'donation'
  | 'payment';

export interface TableOption {
  label: string;
  seats: number;
  price: number;
}

export interface PromoCode {
  code: string;
  type: 'percent' | 'fixed';
  discount: number;
  expiresAt?: string; // ISO date (YYYY-MM-DD) — au-delà, le code est refusé
  maxUses?: number;   // nombre max d'utilisations (0/absent = illimité)
}

export interface FieldOption {
  label: string;
  imageUrl?: string;
}

export interface FormField {
  id: string;
  type: FieldType;
  label: string;
  description?: string;
  placeholder?: string;
  required?: boolean;
  options?: FieldOption[];
  amount?: number;
  currency?: string;
  imageUrl?: string;
  presetValue?: string;
  maxPeople?: number;
  venue?: string;
  allowCash?: boolean;
  tableOptions?: TableOption[];
  suggestedAmounts?: number[];
  allowCustomAmount?: boolean;
  perGuest?: boolean; // pour select/radio : poser le choix pour chaque convive
  // Options avancées par champ
  min?: number;          // nombre : valeur minimale
  max?: number;          // nombre : valeur maximale
  unit?: string;         // nombre : suffixe (ex : "ans", "kg")
  maxLength?: number;    // texte court/long : limite de caractères
  dateMode?: 'past' | 'future'; // date au choix : restreindre au passé / futur
  minPeople?: number;    // nombre de personnes : minimum
  defaultChecked?: boolean; // case à cocher : cochée par défaut
  helpText?: string;     // petite aide affichée sous le champ
  dropdown?: boolean;    // select/radio : afficher en liste déroulante (longues listes)
}

export interface FormResponse {
  id: string;
  formId: string;
  userId?: string;
  data: Record<string, string | boolean>;
  submittedAt: string;
  paymentStatus?: 'paid' | 'unpaid' | 'pending' | 'cash';
  paymentAmount?: number;
  paymentMethod?: 'card' | 'cash';
  checkedIn?: boolean;
  tableNumber?: number;
}

export interface Form {
  id: string;
  title: string;
  description?: string;
  fields: FormField[];
  createdAt: string;
  updatedAt: string;
  responses: FormResponse[];
  coverImage?: string;
  youtubeUrl?: string;
  disabled?: boolean;
  archived?: boolean;
  promoCodes?: PromoCode[];
  maxCapacity?: number;
  accentColor?: string;
  publishAt?: string;  // date ISO — le formulaire n'est public qu'à partir de cette date (#40)
}

export interface AppUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  createdAt: string;
}
