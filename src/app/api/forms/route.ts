import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { kv } from '@vercel/kv';
import { Form } from '@/lib/types';

const FORMS_KEY = 'formlux_forms';

function isAdmin(req: NextRequest): boolean {
  const cookie = req.cookies.get('hl_admin');
  return cookie?.value === 'authenticated';
}

export async function GET() {
  try {
    const forms = (await kv.get<Form[]>(FORMS_KEY)) ?? [];
    return NextResponse.json(forms);
  } catch {
    return NextResponse.json([], { status: 200 });
  }
}

export async function POST(req: NextRequest) {
  if (!isAdmin(req)) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  }
  try {
    const form: Form = await req.json();
    const forms = (await kv.get<Form[]>(FORMS_KEY)) ?? [];
    const idx = forms.findIndex((f) => f.id === form.id);
    if (idx >= 0) forms[idx] = form;
    else forms.push(form);
    await kv.set(FORMS_KEY, forms);
    return NextResponse.json(form);
  } catch {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  if (!isAdmin(req)) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  }
  try {
    const { id } = await req.json();
    const forms = (await kv.get<Form[]>(FORMS_KEY)) ?? [];
    await kv.set(FORMS_KEY, forms.filter((f) => f.id !== id));
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
