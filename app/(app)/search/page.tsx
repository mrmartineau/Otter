import { Feed } from '@/src/components/Feed';
import { CONTENT } from '@/src/constants';
import { Bookmark } from '@/src/types/db';
import { Database } from '@/src/types/supabase';
import { type ApiParameters } from '@/src/utils/fetching/apiParameters';
import { MagnifyingGlass } from '@phosphor-icons/react/dist/ssr';
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { Metadata } from 'next';
import { cookies } from 'next/headers';

type SearchPageProps = ApiParameters & {
  searchTerm: string;
};

type Props = {
  searchParams: Partial<SearchPageProps>;
};

export async function generateMetadata({
  searchParams,
}: Props): Promise<Metadata> {
  return {
    title: `${CONTENT.searchTitle}: ${decodeURIComponent(
      searchParams.searchTerm || '',
    )}`,
  };
}

export default async function SearchPage({ searchParams }: Props) {
  const { limit, offset, searchTerm } = searchParams;
  const supabaseClient = createServerComponentClient<Database>({ cookies });
  const { data, count } = await supabaseClient
    .from('bookmarks')
    .select('*', { count: 'exact' })
    .or(
      `title.ilike.*${searchTerm}*,url.ilike.*${searchTerm}*,description.ilike.*${searchTerm}*,note.ilike.*${searchTerm}*,tags.cs.{${searchTerm}}`,
    )
    .match({ status: 'active' })
    .order('created_at', { ascending: false })
    .limit(20);

  return (
    <Feed
      items={data as Bookmark[]}
      count={count || 0}
      limit={limit}
      offset={offset}
      allowGroupByDate={true}
      title={`${CONTENT.searchTitle}: ${searchTerm}`}
      icon={<MagnifyingGlass weight="duotone" size={24} />}
      feedType="bookmarks"
    />
  );
}
