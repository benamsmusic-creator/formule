import { NextRequest, NextResponse } from 'next/server';
import { kv } from '@vercel/kv';
import { Form } from '@/lib/types';

const FORMS_KEY = 'formlux_forms';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const forms = (await kv.get<Form[]>(FORMS_KEY)) ?? [];
    const form = forms.find((f) => f.id === id);
    if (!form) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json(form);
  } catch {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
