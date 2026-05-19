'use client';
import { Form, FormResponse, AppUser } from './types';
import { generateId } from './utils';
import { supabase } from './supabase';

const FORMS_KEY = 'formlux_forms';
const SESSION_KEY = 'hl_session';

/* ─── Forms — localStorage + sync Supabase (admin) ──────────── */

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

/** Sauvegarde uniquement dans localStorage (synchrone, toujours disponible) */
export function saveFormLocally(form: Form): void {
  const forms = getForms();
  const idx = forms.findIndex((f) => f.id === form.id);
  if (idx >= 0) forms[idx] = form;
  else forms.push(form);
  localStorage.setItem(FORMS_KEY, JSON.stringify(forms));
}

/**
 * Persiste le formulaire sur le serveur (Supabase via /api/forms).
 * Attend la confirmation de l'écriture et lève une erreur si elle échoue.
 * Doit toujours être appelée après saveFormLocally.
 */
export async function saveFormToServer(form: Form): Promise<void> {
  console.log('[saveFormToServer] Début sauvegarde — id:', form.id);
  const res = await fetch('/api/forms', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(form),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const msg = (body as { error?: string }).error ?? `HTTP ${res.status}`;
    console.error('[saveFormToServer] ERREUR serveur:', msg);
    throw new Error(msg);
  }
  console.log('[saveFormToServer] ✓ Sauvegardé sur le serveur — id:', form.id);
}

/** Compatibilité : sauvegarde locale + envoi serveur en arrière-plan (non bloquant) */
export function saveForm(form: Form): void {
  saveFormLocally(form);
  saveFormToServer(form).catch((err) =>
    console.warn('[saveForm] Sync serveur échouée (non bloquant):', err)
  );
}

export function deleteForm(id: string): void {
  const forms = getForms().filter((f) => f.id !== id);
  localStorage.setItem(FORMS_KEY, JSON.stringify(forms));
  fetch('/api/forms', {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id }),
  }).catch(() => {});
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
  // Sauvegarde locale uniquement — le serveur est synchronisé par doSave()
  // avec le formulaire complet (fields inclus) pour éviter la race condition.
  saveFormLocally(form);
  return form;
}

/* ─── Responses — Supabase direct (RLS enforced) ─────────────── */

/**
 * Insère une réponse de formulaire en base de données.
 * Attend la confirmation de l'écriture (await) avant de retourner.
 * Lève une Error détaillée si l'insertion échoue — NE SIMULE JAMAIS UN SUCCÈS.
 */
export async function addResponse(
  formId: string,
  data: Record<string, string | boolean>,
  userId?: string,
  paymentMethod?: 'card' | 'cash',
  paymentAmount?: number,
): Promise<FormResponse> {
  const id = crypto.randomUUID();
  const submittedAt = new Date().toISOString();
  const paymentStatus =
    paymentMethod === 'cash' ? 'cash' : paymentMethod === 'card' ? 'paid' : undefined;

  console.log(
    '[addResponse] Insertion — formId:', formId,
    '| method:', paymentMethod ?? 'aucun',
    '| amount:', paymentAmount ?? 'N/A',
    '| userId:', userId ?? 'anonyme',
  );

  const { error } = await supabase.from('responses').insert({
    id,
    form_id: formId,          // clé étrangère vers forms.id
    user_id: userId ?? null,
    data,                     // JSON : tous les champs du formulaire
    submitted_at: submittedAt,
    payment_method: paymentMethod ?? null,
    payment_status: paymentStatus ?? null,
    payment_amount: paymentAmount ?? null,  // montant réel enregistré en DB
  });

  if (error) {
    // Log complet côté client pour debug
    console.error(
      '[addResponse] ERREUR Supabase:',
      '| code:', error.code,
      '| message:', error.message,
      '| details:', error.details,
      '| hint:', error.hint,
    );
    throw new Error(
      error.message
        ? `Erreur base de données : ${error.message}`
        : "L'enregistrement a échoué. Veuillez réessayer."
    );
  }

  console.log('[addResponse] ✓ Réponse enregistrée en base — id:', id);
  return { id, formId, userId, data, submittedAt, paymentMethod, paymentStatus, paymentAmount };
}

/* ─── Session — cache localStorage (accès synchrone) ────────── */

export function getCurrentUser(): AppUser | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function setCurrentUser(user: AppUser | null): void {
  if (user) {
    localStorage.setItem(SESSION_KEY, JSON.stringify(user));
  } else {
    localStorage.removeItem(SESSION_KEY);
  }
}

/* ─── Auth — Supabase Auth ───────────────────────────────────── */

export async function registerUser(
  email: string,
  password: string,
  firstName: string,
  lastName: string
): Promise<{ user: AppUser } | { error: string }> {
  const { data, error } = await supabase.auth.signUp({
    email: email.toLowerCase().trim(),
    password,
    options: { data: { firstName: firstName.trim(), lastName: lastName.trim() } },
  });

  if (error) return { error: error.message };

  // Supabase retourne user=null si l'email existe déjà (protection anti-enumération)
  if (!data.user) return { error: 'Un compte existe déjà avec cet email.' };

  // Auto-confirme l'email via l'API admin (contourne la vérification email)
  if (!data.session) {
    await fetch('/api/users/confirm', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: data.user.id }),
    });
    // Re-connexion automatique après confirmation
    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email: email.toLowerCase().trim(),
      password,
    });
    if (signInError || !signInData.session) {
      return { error: 'Compte créé. Connectez-vous pour continuer.' };
    }
  }

  const user: AppUser = {
    id: data.user.id,
    email: data.user.email!,
    firstName: firstName.trim(),
    lastName: lastName.trim(),
    createdAt: data.user.created_at,
  };
  setCurrentUser(user);
  return { user };
}

export async function loginUser(email: string, password: string): Promise<AppUser | null> {
  const { data, error } = await supabase.auth.signInWithPassword({
    email: email.toLowerCase().trim(),
    password,
  });

  if (error || !data.user) return null;

  const meta = data.user.user_metadata ?? {};
  const user: AppUser = {
    id: data.user.id,
    email: data.user.email!,
    firstName: meta.firstName ?? '',
    lastName: meta.lastName ?? '',
    createdAt: data.user.created_at,
  };
  setCurrentUser(user);
  return user;
}

export async function logoutUser(): Promise<void> {
  await supabase.auth.signOut();
  setCurrentUser(null);
}

export async function getUserResponses(
  userId: string
): Promise<{ form: Form; response: FormResponse }[]> {
  const { data, error } = await supabase
    .from('responses')
    .select('*, forms(*)')
    .eq('user_id', userId)
    .order('submitted_at', { ascending: false });

  if (error || !data) return [];

  return data
    .filter((r) => r.forms)
    .map((r) => {
      const f = r.forms as Record<string, unknown>;
      return {
        form: {
          id: f.id as string,
          title: f.title as string,
          description: f.description as string | undefined,
          fields: f.fields as Form['fields'],
          coverImage: f.cover_image as string | undefined,
          createdAt: f.created_at as string,
          updatedAt: f.updated_at as string,
          responses: [],
        },
        response: {
          id: r.id,
          formId: r.form_id,
          userId: r.user_id ?? undefined,
          data: r.data,
          submittedAt: r.submitted_at,
          paymentStatus: r.payment_status ?? undefined,
          paymentAmount: r.payment_amount ?? undefined,
          paymentMethod: r.payment_method ?? undefined,
        } as FormResponse,
      };
    });
}
