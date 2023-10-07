import { Feed } from '@/src/components/Feed';
import { CONTENT } from '@/src/constants';
import { Database } from '@/src/types/supabase';
import { type ApiParameters } from '@/src/utils/fetching/apiParameters';
import { getToots } from '@/src/utils/fetching/toots';
import { ListBullets } from '@phosphor-icons/react/dist/ssr';
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

export const metadata = {
  title: 'Toots',
};

export default async function FeedPage({
  searchParams,
}: {
  searchParams: Partial<Pick<ApiParameters, 'limit' | 'offset' | 'order'>>;
}) {
  const { limit, offset } = searchParams;
  const supabaseClient = createServerComponentClient<Database>({ cookies });
  const { data, count } = await getToots({
    supabaseClient,
    params: searchParams,
    likes: true,
  });
  return (
    <Feed
      items={data}
      count={count || 0}
      limit={limit}
      offset={offset}
      allowGroupByDate={true}
      title={CONTENT.tootsMineTitle}
      icon={<ListBullets weight="duotone" size={24} />}
      feedType="toots"
    />
  );
}
