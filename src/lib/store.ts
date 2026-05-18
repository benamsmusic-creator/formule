'use client';
import { Form, FormResponse } from './types';
import { generateId } from './utils';

const FORMS_KEY = 'formlux_forms';

export function getForms(): Form[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(FORMS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function getForm(id: string): Form | null {
  return getForms().find((f) => f.id === id) ?? null;
}

export function saveForm(form: Form): void {
  const forms = getForms();
  const idx = forms.findIndex((f) => f.id === form.id);
  if (idx >= 0) {
    forms[idx] = form;
  } else {
    forms.push(form);
  }
  localStorage.setItem(FORMS_KEY, JSON.stringify(forms));
}

export function deleteForm(id: string): void {
  const forms = getForms().filter((f) => f.id !== id);
  localStorage.setItem(FORMS_KEY, JSON.stringify(forms));
}

export function createForm(title: string): Form {
  const form: Form = {
    id: generateId(),
    title,
    description: '',
    fields: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    responses: [],
  };
  saveForm(form);
  return form;
}

export function addResponse(formId: string, data: Record<string, string | boolean>): FormResponse {
  const form = getForm(formId);
  if (!form) throw new Error('Form not found');
  const response: FormResponse = {
    id: generateId(),
    formId,
    data,
    submittedAt: new Date().toISOString(),
  };
  form.responses = [...(form.responses || []), response];
  form.updatedAt = new Date().toISOString();
  saveForm(form);
  return response;
}
