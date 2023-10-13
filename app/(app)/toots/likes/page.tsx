import { Feed } from '@/src/components/Feed';
import { MastodonLogo } from '@/src/components/MastodonLogo';
import { CONTENT, ROUTE_TOOTS_LIKES, ROUTE_TOOTS_MINE } from '@/src/constants';
import { createServerComponentClient } from '@/src/utils/createServerComponentClient';
import { type ApiParameters } from '@/src/utils/fetching/apiParameters';
import { getToots } from '@/src/utils/fetching/toots';

export const metadata = {
  title: CONTENT.tootsLikeTitle,
};

export default async function LikedTootsPage({
  searchParams,
}: {
  searchParams: Partial<Pick<ApiParameters, 'limit' | 'offset' | 'order'>>;
}) {
  const { limit, offset } = searchParams;
  const supabaseClient = createServerComponentClient();
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
      title={CONTENT.tootsTitle}
      icon={<MastodonLogo size={24} />}
      feedType="toots"
      subNav={[
        {
          text: CONTENT.tootsMineTitle,
          href: ROUTE_TOOTS_MINE,
          isActive: false,
        },
        {
          text: CONTENT.tootsLikeTitle,
          href: ROUTE_TOOTS_LIKES,
          isActive: true,
        },
      ]}
    />
  );
}
