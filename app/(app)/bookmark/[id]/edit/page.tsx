import { BookmarkForm } from '@/src/components/BookmarkForm';
import { getBookmark } from '@/src/utils/fetching/bookmarks';
import { createServerClient } from '@/src/utils/supabase/server';
import { cookies } from 'next/headers';

export default async function NewPage({ params }: { params: { id: string } }) {
  const cookieStore = cookies();
  const supabaseClient = createServerClient(cookieStore);
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
