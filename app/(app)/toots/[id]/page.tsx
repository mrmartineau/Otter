import { getToot } from '@/src/utils/fetching/toots';
import { createServerClient } from '@/src/utils/supabase/server';
import { cookies } from 'next/headers';

import { TootFeedItem } from '../../../../src/components/TootFeedItem';

export default async function BookmarkPage({
  params,
}: {
  params: { id: string };
}) {
  const cookieStore = cookies();
  const supabaseClient = createServerClient(cookieStore);
  const { data } = await getToot({ supabaseClient, id: params.id });
  // @ts-ignore
  return <TootFeedItem {...data} />;
}
