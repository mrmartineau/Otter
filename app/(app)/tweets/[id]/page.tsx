import { getTweet } from '@/src/utils/fetching/tweets';
import { createServerClient } from '@/src/utils/supabase/server';
import { cookies } from 'next/headers';

import { TweetFeedItem } from '../../../../src/components/TweetFeedItem';

export default async function BookmarkPage(
  props: {
    params: Promise<{ id: string }>;
  }
) {
  const params = await props.params;
  const cookieStore = await cookies();
  const supabaseClient = createServerClient(cookieStore);
  const { data } = await getTweet({ supabaseClient, id: params.id });
  // @ts-ignore
  return <TweetFeedItem {...data} />;
}
