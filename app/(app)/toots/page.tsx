import { Feed } from '@/src/components/Feed';
import { MastodonLogo } from '@/src/components/MastodonLogo';
import { CONTENT, ROUTE_TOOTS_LIKES, ROUTE_TOOTS_MINE } from '@/src/constants';
import { type ApiParametersQuery } from '@/src/utils/fetching/apiParameters';
import { getDbMetadata } from '@/src/utils/fetching/meta';
import { getToots } from '@/src/utils/fetching/toots';
import { createServerClient } from '@/src/utils/supabase/server';
import { cookies } from 'next/headers';

export const metadata = {
  title: CONTENT.tootsMineTitle,
};

export default async function MyTootsPage({
  searchParams,
}: {
  searchParams: Partial<Pick<ApiParametersQuery, 'limit' | 'offset' | 'order'>>;
}) {
  const { limit, offset } = searchParams;
  const cookieStore = cookies();
  const supabaseClient = createServerClient(cookieStore);
  const { data, count } = await getToots({
    supabaseClient,
    params: searchParams,
    likes: false,
  });
  const dbMeta = await getDbMetadata(supabaseClient);
  const hasToots = dbMeta.toots > 0;
  const hasLikedToots = dbMeta.likedToots > 0;
  const subNav = [];
  if (hasToots) {
    subNav.push({
      text: CONTENT.tootsMineTitle,
      href: ROUTE_TOOTS_MINE,
      isActive: true,
    });
  }
  if (hasLikedToots) {
    subNav.push({
      text: CONTENT.tootsLikeTitle,
      href: ROUTE_TOOTS_LIKES,
      isActive: false,
    });
  }

  return (
    <Feed
      items={data}
      count={count || 0}
      limit={limit}
      offset={offset}
      allowGroupByDate={true}
      title={CONTENT.tootsTitle}
      icon={<MastodonLogo size={24} />}
      feedType="toots"
      subNav={subNav}
    />
  );
}
