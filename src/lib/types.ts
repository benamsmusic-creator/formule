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
}

export interface AppUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  createdAt: string;
}
