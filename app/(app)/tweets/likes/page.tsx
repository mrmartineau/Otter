import { Feed } from '@/src/components/Feed';
import {
  CONTENT,
  ROUTE_TWEETS_LIKES,
  ROUTE_TWEETS_MINE,
} from '@/src/constants';
import { type ApiParameters } from '@/src/utils/fetching/apiParameters';
import { getDbMetadata } from '@/src/utils/fetching/meta';
import { getTweets } from '@/src/utils/fetching/tweets';
import { createServerClient } from '@/src/utils/supabase/server';
import { TwitterLogo } from '@phosphor-icons/react/dist/ssr';
import { cookies } from 'next/headers';

export const metadata = {
  title: CONTENT.tweetsLikeTitle,
};

export default async function LikedTweetsPage({
  searchParams,
}: {
  searchParams: Partial<Pick<ApiParameters, 'limit' | 'offset' | 'order'>>;
}) {
  const { limit, offset } = searchParams;
  const cookieStore = cookies();
  const supabaseClient = createServerClient(cookieStore);
  const { data, count } = await getTweets({
    supabaseClient,
    params: searchParams,
    likes: true,
  });
  const dbMeta = await getDbMetadata(supabaseClient);
  const hasToots = dbMeta.toots > 0;
  const hasLikedToots = dbMeta.likedToots > 0;
  const subNav = [];
  if (hasToots) {
    subNav.push({
      text: CONTENT.tweetsMineTitle,
      href: ROUTE_TWEETS_MINE,
      isActive: false,
    });
  }
  if (hasLikedToots) {
    subNav.push({
      text: CONTENT.tweetsLikeTitle,
      href: ROUTE_TWEETS_LIKES,
      isActive: true,
    });
  }

  return (
    <Feed
      items={data}
      count={count || 0}
      limit={limit}
      offset={offset}
      allowGroupByDate={true}
      title={CONTENT.tweetsTitle}
      icon={<TwitterLogo aria-label="My tweets" size={24} weight="duotone" />}
      feedType="tweets"
      subNav={subNav}
    />
  );
}
