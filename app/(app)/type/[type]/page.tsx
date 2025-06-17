import { Feed } from '@/src/components/Feed';
import { TypeToIcon } from '@/src/components/TypeToIcon';
import { Bookmark, BookmarkType } from '@/src/types/db';
import { type ApiParametersQuery } from '@/src/utils/fetching/apiParameters';
import { getBookmarks } from '@/src/utils/fetching/bookmarks';
import { createServerClient } from '@/src/utils/supabase/server';
import { Metadata } from 'next';
import { cookies } from 'next/headers';
import title from 'title';

type Props = {
  params: Promise<{ type: string }>;
  searchParams: Promise<Partial<ApiParametersQuery>>;
};

export async function generateMetadata(props: Props): Promise<Metadata> {
  const params = await props.params;
  return {
    title: `Type: ${title(decodeURIComponent(params.type))}`,
  };
}

export default async function TagPage(props: Props) {
  const searchParams = await props.searchParams;
  const params = await props.params;
  const { limit, offset } = searchParams;
  const cookieStore = await cookies();
  const supabaseClient = createServerClient(cookieStore);
  const type = decodeURIComponent(params.type);
  const { data, count } = await getBookmarks({
    supabaseClient,
    params: { ...searchParams, type },
  });
  return (
    <Feed
      items={data as Bookmark[]}
      count={count || 0}
      limit={limit}
      offset={offset}
      allowGroupByDate={true}
      title={title(type)}
      icon={<TypeToIcon size={24} type={type as BookmarkType} />}
      feedType="bookmarks"
    />
  );
}
