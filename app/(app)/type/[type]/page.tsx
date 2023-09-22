import { Feed } from '@/src/components/Feed';
import { Database } from '@/src/types/supabase';
import { type ApiParameters } from '@/src/utils/fetching/apiParameters';
import { getBookmarks } from '@/src/utils/fetching/bookmarks';
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { Metadata } from 'next';
import { cookies } from 'next/headers';
import title from 'title';

export const dynamic = 'force-dynamic';

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
  const supabaseClient = createServerComponentClient<Database>({ cookies });
  const type = decodeURIComponent(params.type);
  const { data, count } = await getBookmarks({
    supabaseClient,
    params: { ...searchParams, type },
  });
  return (
    <Feed
      items={data}
      count={count || 0}
      limit={limit}
      offset={offset}
      allowGroupByDate={true}
      title={title(type)}
      // icon={<ListBullets />}
      feedType="bookmarks"
    />
  );
}
