import { createServerComponentClient as _createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { cache } from 'react';

import { Database } from '../types/supabase';

export const createServerComponentClient = cache(() => {
  const cookieStore = cookies();
  return _createServerComponentClient<Database>({ cookies: () => cookieStore });
});
