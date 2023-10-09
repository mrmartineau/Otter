import { Feed } from '@/src/components/Feed';
import { CONTENT } from '@/src/constants';
import { Bookmark } from '@/src/types/db';
import { Database } from '@/src/types/supabase';
import { type ApiParameters } from '@/src/utils/fetching/apiParameters';
import { getBookmarks } from '@/src/utils/fetching/bookmarks';
import { Star } from '@phosphor-icons/react/dist/ssr';
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

export default async function StarsPage({
  searchParams,
}: {
  searchParams: Partial<ApiParameters>;
}) {
  const { limit, offset } = searchParams;
  const supabaseClient = createServerComponentClient<Database>({ cookies });
  const { data, count } = await getBookmarks({
    supabaseClient,
    params: { ...searchParams, star: true },
  });
  return (
    <Feed
      items={data as Bookmark[]}
      count={count || 0}
      limit={limit}
      offset={offset}
      allowGroupByDate={true}
      title={CONTENT.starsTitle}
      icon={<Star weight="duotone" size={24} />}
      feedType="bookmarks"
    />
  );
}
