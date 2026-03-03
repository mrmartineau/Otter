import { env } from 'cloudflare:workers'
import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/supabase'
import { supabaseUrl } from '@/utils/supabase/client'

/**
 * Creates a Supabase client using the service key.
 * Use this for server-side operations where no user JWT is available
 * (e.g. webhook handlers).
 */
export const createServiceClient = () => {
  // @ts-expect-error - env typing
  return createClient<Database>(supabaseUrl, env.SUPABASE_SERVICE_KEY)
}
