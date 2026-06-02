import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export async function GET(req: NextRequest) {
  if (req.cookies.get('hl_admin')?.value !== 'authenticated') {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  }
  const org = req.cookies.get('hl_org')?.value || 'habadlyon';
  const { data } = await supabaseAdmin
    .from('audit_log')
    .select('id, action, detail, created_at')
    .eq('org_id', org)
    .order('created_at', { ascending: false })
    .limit(100);
  return NextResponse.json(data ?? []);
}
