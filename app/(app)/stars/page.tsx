import { Feed } from '@/src/components/Feed';
import { CONTENT } from '@/src/constants';
import { Bookmark } from '@/src/types/db';
import { type ApiParametersQuery } from '@/src/utils/fetching/apiParameters';
import { getBookmarks } from '@/src/utils/fetching/bookmarks';
import { createServerClient } from '@/src/utils/supabase/server';
import { Star } from '@phosphor-icons/react/dist/ssr';
import { cookies } from 'next/headers';

export const metadata = {
  title: `Starred bookmarks – Otter`,
};

export default async function StarsPage(
  props: {
    searchParams: Promise<Partial<ApiParametersQuery>>;
  }
) {
  const searchParams = await props.searchParams;
  const { limit, offset } = searchParams;
  const cookieStore = await cookies();
  const supabaseClient = createServerClient(cookieStore);
  const { data, count } = await getBookmarks({
    supabaseClient,
    params: { ...searchParams, star: 'true' },
  });
  return (
    <Feed
      items={data as Bookmark[]}
      count={count || 0}
      limit={limit}
      offset={offset}
      allowGroupByDate={false}
      title={CONTENT.starsTitle}
      icon={<Star weight="duotone" size={24} />}
      feedType="bookmarks"
    />
  );
}
