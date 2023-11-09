import { createBrowserClient as _createBrowserClient } from '@supabase/ssr';

export const createBrowserClient = <DB>() =>
  _createBrowserClient<DB>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
