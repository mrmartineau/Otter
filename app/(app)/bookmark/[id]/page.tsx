import { BookmarkFeedItem } from '@/src/components/BookmarkFeedItem';
import { createServerComponentClient } from '@/src/utils/createServerComponentClient';
import { getBookmark } from '@/src/utils/fetching/bookmarks';

export default async function BookmarkPage({
  params,
}: {
  params: { id: string };
}) {
  const supabaseClient = createServerComponentClient();
  const { data } = await getBookmark({ supabaseClient, id: params.id });
  // @ts-ignore
  return <BookmarkFeedItem {...data} />;
}
