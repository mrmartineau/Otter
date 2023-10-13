import { BookmarkForm } from '@/src/components/BookmarkForm';
import { createServerComponentClient } from '@/src/utils/createServerComponentClient';
import { getBookmark } from '@/src/utils/fetching/bookmarks';

export default async function NewPage({
  searchParams,
  params,
}: {
  searchParams: { url: string };
  params: { id: string };
}) {
  const supabaseClient = createServerComponentClient();
  const bookmarkItem = await getBookmark({ supabaseClient, id: params.id });

  return (
    <BookmarkForm
      type="edit"
      initialValues={{
        title: bookmarkItem?.data?.title,
        url: bookmarkItem?.data?.url,
        description: bookmarkItem?.data?.description,
        note: bookmarkItem?.data?.note,
        tags: bookmarkItem?.data?.tags,
        star: bookmarkItem?.data?.star,
        type: bookmarkItem?.data?.type,
        image: bookmarkItem?.data?.image,
      }}
      id={params.id}
    />
  );
}
