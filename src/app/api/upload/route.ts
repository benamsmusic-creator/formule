import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export const runtime = 'nodejs';

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const MAX_SIZE_BYTES = 5 * 1024 * 1024; // 5 Mo
const BUCKET = 'form-images';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;

    // — Validation —
    if (!file) {
      return NextResponse.json({ error: 'Aucun fichier fourni' }, { status: 400 });
    }
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: 'Format non supporté (jpg, png, webp, gif uniquement)' },
        { status: 400 }
      );
    }
    if (file.size > MAX_SIZE_BYTES) {
      return NextResponse.json(
        { error: 'Fichier trop lourd (max 5 Mo)' },
        { status: 400 }
      );
    }

    // — Nom de fichier unique —
    const ext = file.type.split('/')[1].replace('jpeg', 'jpg');
    const filename = `${Date.now()}-${crypto.randomUUID().slice(0, 8)}.${ext}`;

    // — Upload vers Supabase Storage —
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const { data, error } = await supabaseAdmin.storage
      .from(BUCKET)
      .upload(filename, buffer, {
        contentType: file.type,
        cacheControl: '31536000', // 1 an
        upsert: false,
      });

    if (error) {
      console.error('[upload] Supabase Storage:', error.message);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // — URL publique —
    const { data: { publicUrl } } = supabaseAdmin.storage
      .from(BUCKET)
      .getPublicUrl(data.path);

    return NextResponse.json({ url: publicUrl });
  } catch (err) {
    console.error('[upload] Erreur inattendue:', err);
    return NextResponse.json(
      { error: "Erreur serveur lors de l'upload" },
      { status: 500 }
    );
  }
}
