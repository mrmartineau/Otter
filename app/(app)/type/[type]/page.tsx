import { Database } from '@/src/types/supabase';
import { type ApiParameters } from '@/src/utils/fetching/apiParameters';
import { getBookmarks } from '@/src/utils/fetching/bookmarks';
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

export const dynamic = 'force-dynamic';

export default async function TagPage({
  params,
  searchParams,
}: {
  params: { type: string };
  searchParams: Partial<ApiParameters>;
}) {
  const supabaseClient = createServerComponentClient<Database>({ cookies });
  const { data } = await getBookmarks({
    supabaseClient,
    params: { ...searchParams, type: params.type },
  });
  return (
    <div>
      <pre>{JSON.stringify(data, null, 2)}</pre>
    </div>
  );
}
