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
}

export interface AppUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  createdAt: string;
}
