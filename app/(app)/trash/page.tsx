import { Feed } from '@/src/components/Feed';
import { CONTENT } from '@/src/constants';
import { Bookmark } from '@/src/types/db';
import { createServerComponentClient } from '@/src/utils/createServerComponentClient';
import { type ApiParameters } from '@/src/utils/fetching/apiParameters';
import { getBookmarks } from '@/src/utils/fetching/bookmarks';
import { Trash } from '@phosphor-icons/react/dist/ssr';

export const metadata = {
  title: 'Trash',
};

export default async function TrashPage({
  searchParams,
}: {
  searchParams: Partial<ApiParameters>;
}) {
  const { limit, offset } = searchParams;
  const supabaseClient = createServerComponentClient();
  const { data, count } = await getBookmarks({
    supabaseClient,
    params: { ...searchParams, status: 'inactive' },
  });
  return (
    <Feed
      items={data as Bookmark[]}
      count={count || 0}
      limit={limit}
      offset={offset}
      allowGroupByDate={true}
      title={CONTENT.trashTitle}
      icon={<Trash weight="duotone" size={24} />}
      feedType="bookmarks"
      allowDeletion
    />
  );
}
