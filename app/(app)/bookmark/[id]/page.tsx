import { Database } from '@/src/types/supabase';
import { getBookmark } from '@/src/utils/fetching/bookmarks';
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

export const dynamic = 'force-dynamic';

export default async function BookmarkPage({
  params,
}: {
  params: { id: string };
}) {
  const supabaseClient = createServerComponentClient<Database>({ cookies });
  const { data } = await getBookmark({ supabaseClient, id: params.id });
  return (
    <div>
      <pre>{JSON.stringify(data, null, 2)}</pre>
    </div>
  );
}
