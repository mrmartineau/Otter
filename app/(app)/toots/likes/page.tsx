import { Feed } from '@/src/components/Feed';
import { MastodonLogo } from '@/src/components/MastodonLogo';
import { CONTENT, ROUTE_TOOTS_LIKES, ROUTE_TOOTS_MINE } from '@/src/constants';
import { Database } from '@/src/types/supabase';
import { type ApiParameters } from '@/src/utils/fetching/apiParameters';
import { getToots } from '@/src/utils/fetching/toots';
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

export const metadata = {
  title: 'Toots',
};

export default async function LikedTootsPage({
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
      title={CONTENT.tootsLikeTitle}
      icon={<MastodonLogo size={24} />}
      feedType="toots"
      subNav={[
        { text: 'My toots', href: ROUTE_TOOTS_MINE, isActive: false },
        { text: 'My liked toots', href: ROUTE_TOOTS_LIKES, isActive: true },
      ]}
    />
  );
}
