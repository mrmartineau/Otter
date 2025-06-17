import { Feed } from '@/src/components/Feed';
import { Bookmark } from '@/src/types/db';
import { type ApiParametersQuery } from '@/src/utils/fetching/apiParameters';
import { getBookmarks } from '@/src/utils/fetching/bookmarks';
import { createServerClient } from '@/src/utils/supabase/server';
import { Hash } from '@phosphor-icons/react/dist/ssr';
import { Metadata } from 'next';
import { cookies } from 'next/headers';

type Props = {
  params: Promise<{ name: string }>;
  searchParams: Promise<Partial<ApiParametersQuery>>;
};

export async function generateMetadata(props: Props): Promise<Metadata> {
  const params = await props.params;
  return {
    title: `Tag: #${decodeURIComponent(params.name)}`,
  };
}

export default async function TagPage(props: Props) {
  const searchParams = await props.searchParams;
  const params = await props.params;
  const { limit, offset } = searchParams;
  const cookieStore = await cookies();
  const supabaseClient = createServerClient(cookieStore);
  const tag = decodeURIComponent(params.name);
  const { data, count } = await getBookmarks({
    supabaseClient,
    params: { ...searchParams, tag },
  });
  return (
    <Feed
      items={data as Bookmark[]}
      count={count || 0}
      limit={limit}
      offset={offset}
      allowGroupByDate={true}
      title={tag}
      icon={<Hash weight="duotone" size={24} />}
      feedType="bookmarks"
    />
  );
}
