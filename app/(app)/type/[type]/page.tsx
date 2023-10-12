import { Feed } from '@/src/components/Feed';
import { TypeToIcon } from '@/src/components/TypeToIcon';
import { Bookmark, BookmarkType } from '@/src/types/db';
import { Database } from '@/src/types/supabase';
import { createServerComponentClient } from '@/src/utils/createServerComponentClient';
import { type ApiParameters } from '@/src/utils/fetching/apiParameters';
import { getBookmarks } from '@/src/utils/fetching/bookmarks';
import { Metadata } from 'next';
import { cookies } from 'next/headers';
import title from 'title';

type Props = {
  params: { type: string };
  searchParams: Partial<ApiParameters>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  return {
    title: `Type: ${title(decodeURIComponent(params.type))}`,
  };
}

export default async function TagPage({ params, searchParams }: Props) {
  const { limit, offset } = searchParams;
  const supabaseClient = createServerComponentClient();
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
