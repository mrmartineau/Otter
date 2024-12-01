import { getToot } from '@/src/utils/fetching/toots';
import { createServerClient } from '@/src/utils/supabase/server';
import { cookies } from 'next/headers';

import { TootFeedItem } from '../../../../src/components/TootFeedItem';

export default async function BookmarkPage(
  props: {
    params: Promise<{ id: string }>;
  }
) {
  const params = await props.params;
  const cookieStore = await cookies();
  const supabaseClient = createServerClient(cookieStore);
  const { data } = await getToot({ supabaseClient, id: params.id });
  // @ts-ignore
  return <TootFeedItem {...data} />;
}
