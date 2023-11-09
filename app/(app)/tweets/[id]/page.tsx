import { getTweet } from '@/src/utils/fetching/tweets';
import { createServerClient } from '@/src/utils/supabase/server';
import { cookies } from 'next/headers';

import { TweetFeedItem } from '../../../../src/components/TweetFeedItem';

export default async function BookmarkPage({
  params,
}: {
  params: { id: string };
}) {
  const cookieStore = cookies();
  const supabaseClient = createServerClient(cookieStore);
  const { data } = await getTweet({ supabaseClient, id: params.id });
  // @ts-ignore
  return <TweetFeedItem {...data} />;
}
