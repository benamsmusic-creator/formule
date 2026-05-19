import { createClient } from '@supabase/supabase-js';

// Client navigateur — clé anon, soumis aux RLS
export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);
