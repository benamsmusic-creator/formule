import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

// Renvoie le contexte de l'admin connecté (super-admin ou admin d'organisation).
export async function GET(req: NextRequest) {
  const authenticated = req.cookies.get('hl_admin')?.value === 'authenticated';
  const org = req.cookies.get('hl_org')?.value || null;
  const role = req.cookies.get('hl_role')?.value || null;

  let orgName: string | null = null;
  if (org) {
    const { data } = await supabaseAdmin.from('organizations').select('name').eq('id', org).single();
    orgName = data?.name ?? null;
  }

  return NextResponse.json({
    authenticated,
    superAdmin: authenticated && !org && !role,
    org,
    orgName,
    role,
  });
}
