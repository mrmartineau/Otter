import { Database } from '@/src/types/supabase';
import { createBrowserClient as _createBrowserClient } from '@supabase/ssr';

export const createBrowserClient = () =>
  _createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
