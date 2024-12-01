import { BookmarkFeedItem } from '@/src/components/BookmarkFeedItem';
import { Bookmark } from '@/src/types/db';
import { getBookmark } from '@/src/utils/fetching/bookmarks';
import { createServerClient } from '@/src/utils/supabase/server';
import { cookies } from 'next/headers';

export default async function BookmarkPage(
  props: {
    params: Promise<{ id: string }>;
  }
) {
  const params = await props.params;
  const cookieStore = await cookies();
  const supabaseClient = createServerClient(cookieStore);
  const { data } = await getBookmark({ supabaseClient, id: params.id });
  return <BookmarkFeedItem {...(data as Bookmark)} preventMarkdownClamping />;
}
