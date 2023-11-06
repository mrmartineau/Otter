import { Feed } from '@/src/components/Feed';
import { CONTENT } from '@/src/constants';
import { Bookmark } from '@/src/types/db';
import { type ApiParameters } from '@/src/utils/fetching/apiParameters';
import { getSearchBookmarks } from '@/src/utils/fetching/search';
import { createServerClient } from '@/src/utils/supabase/server';
import { MagnifyingGlass } from '@phosphor-icons/react/dist/ssr';
import { Metadata } from 'next';
import { cookies } from 'next/headers';

type SearchPageProps = ApiParameters & {
  q: string;
};

type Props = {
  searchParams: Partial<SearchPageProps>;
};

export async function generateMetadata({
  searchParams,
}: Props): Promise<Metadata> {
  return {
    title: `${CONTENT.searchTitle}: ${decodeURIComponent(
      searchParams.q || '',
    )}`,
  };
}

export default async function SearchPage({ searchParams }: Props) {
  const { limit, offset, q } = searchParams;
  const cookieStore = cookies();
  const supabaseClient = createServerClient(cookieStore);
  const { data, count } = await getSearchBookmarks({
    supabaseClient,
    params: searchParams,
    searchTerm: q || '',
  });

  return (
    <Feed
      items={data as Bookmark[]}
      count={count || 0}
      limit={limit}
      offset={offset}
      allowGroupByDate={true}
      title={`${CONTENT.searchTitle}: ${q}`}
      icon={<MagnifyingGlass weight="duotone" size={24} />}
      feedType="bookmarks"
    />
  );
}
