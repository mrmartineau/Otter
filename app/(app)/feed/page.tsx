import { Feed } from '@/src/components/Feed';
import { CONTENT } from '@/src/constants';
import { Bookmark } from '@/src/types/db';
import { Database } from '@/src/types/supabase';
import { type ApiParameters } from '@/src/utils/fetching/apiParameters';
import { getBookmarks } from '@/src/utils/fetching/bookmarks';
import { ListBullets } from '@phosphor-icons/react/dist/ssr';
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

export const metadata = {
  title: 'Feed',
};

export default async function FeedPage({
  searchParams,
}: {
  searchParams: Partial<ApiParameters>;
}) {
  const { limit, offset } = searchParams;
  const supabaseClient = createServerComponentClient<Database>({ cookies });
  const { data, count } = await getBookmarks({
    supabaseClient,
    params: searchParams,
  });
  return (
    <Feed
      items={data as Bookmark[]}
      count={count || 0}
      limit={limit}
      offset={offset}
      allowGroupByDate={true}
      title={CONTENT.feedTitle}
      icon={<ListBullets weight="duotone" size={24} />}
      feedType="bookmarks"
    />
  );
}
