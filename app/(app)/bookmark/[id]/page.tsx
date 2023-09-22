import { BookmarkFeedItem } from '@/src/components/BookmarkFeedItem';
import { Database } from '@/src/types/supabase';
import { getBookmark } from '@/src/utils/fetching/bookmarks';
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

export default async function BookmarkPage({
  params,
}: {
  params: { id: string };
}) {
  const supabaseClient = createServerComponentClient<Database>({ cookies });
  const { data } = await getBookmark({ supabaseClient, id: params.id });
  console.log(`🚀 ~ data:`, data);
  // const { click_count, ...rest } = data;
  return <BookmarkFeedItem {...data} />;
}
