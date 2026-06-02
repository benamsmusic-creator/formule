import { NextRequest, NextResponse } from 'next/server';
import '@hebcal/locales';
import { HDate } from '@hebcal/core';
import { supabaseAdmin } from '@/lib/supabase-admin';

// Public : mur du souvenir (noms + date hébraïque, sans données de contact).
export async function GET(req: NextRequest) {
  const org = req.nextUrl.searchParams.get('org') || 'habadlyon';
  const { data } = await supabaseAdmin
    .from('yahrzeits')
    .select('id, name, heb_month, heb_day')
    .eq('org_id', org)
    .order('heb_month', { ascending: true });

  const list = (data ?? []).map((y) => {
    let hebLabel = '';
    try { hebLabel = new HDate(y.heb_day, y.heb_month, 5785).render('fr').replace(/\s*5785/, ''); } catch { /* ignore */ }
    return { id: y.id, name: y.name, hebLabel };
  });
  return NextResponse.json(list);
}
