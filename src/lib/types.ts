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
  | 'payment';

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
}

export interface FormResponse {
  id: string;
  formId: string;
  data: Record<string, string | boolean>;
  submittedAt: string;
  paymentStatus?: 'paid' | 'unpaid' | 'pending';
  paymentAmount?: number;
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
}
