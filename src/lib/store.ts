'use client';
import { Form, FormResponse, AppUser } from './types';
import { generateId } from './utils';

const FORMS_KEY = 'formlux_forms';
const USERS_KEY = 'hl_users';
const SESSION_KEY = 'hl_session';

/* ─── Forms ─────────────────────────────────────────────────── */

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

export function addResponse(
  formId: string,
  data: Record<string, string | boolean>,
  userId?: string,
  paymentMethod?: 'card' | 'cash'
): FormResponse {
  const form = getForm(formId);
  if (!form) throw new Error('Form not found');
  const response: FormResponse = {
    id: generateId(),
    formId,
    userId,
    data,
    submittedAt: new Date().toISOString(),
    paymentMethod,
    paymentStatus: paymentMethod === 'cash' ? 'cash' : paymentMethod === 'card' ? 'paid' : undefined,
  };
  form.responses = [...(form.responses || []), response];
  form.updatedAt = new Date().toISOString();
  saveForm(form);
  return response;
}

/* ─── Users ─────────────────────────────────────────────────── */

export function getUsers(): AppUser[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(USERS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function registerUser(
  email: string,
  password: string,
  firstName: string,
  lastName: string
): { user: AppUser } | { error: string } {
  const users = getUsers();
  const existing = users.find((u) => u.email.toLowerCase() === email.toLowerCase());
  if (existing) return { error: 'Un compte existe déjà avec cet email.' };

  const user: AppUser = {
    id: generateId(),
    email: email.toLowerCase().trim(),
    password,
    firstName: firstName.trim(),
    lastName: lastName.trim(),
    createdAt: new Date().toISOString(),
  };

  users.push(user);
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
  setCurrentUser(user);
  return { user };
}

export function loginUser(email: string, password: string): AppUser | null {
  const users = getUsers();
  const user = users.find(
    (u) => u.email.toLowerCase() === email.toLowerCase() && u.password === password
  );
  if (user) {
    setCurrentUser(user);
    return user;
  }
  return null;
}

export function getCurrentUser(): AppUser | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function setCurrentUser(user: AppUser | null): void {
  if (user) {
    localStorage.setItem(SESSION_KEY, JSON.stringify(user));
  } else {
    localStorage.removeItem(SESSION_KEY);
  }
}

export function logoutUser(): void {
  setCurrentUser(null);
}

export function getUserResponses(userId: string): { form: Form; response: FormResponse }[] {
  const forms = getForms();
  const results: { form: Form; response: FormResponse }[] = [];
  for (const form of forms) {
    for (const response of form.responses ?? []) {
      if (response.userId === userId) {
        results.push({ form, response });
      }
    }
  }
  return results.sort((a, b) =>
    new Date(b.response.submittedAt).getTime() - new Date(a.response.submittedAt).getTime()
  );
}
