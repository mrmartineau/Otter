import { BookmarkForm } from '@/src/components/BookmarkForm';
import { Database } from '@/src/types/supabase';
import { getBookmark } from '@/src/utils/fetching/bookmarks';
import { getDbMetadata } from '@/src/utils/fetching/meta';
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

export default async function NewPage({
  searchParams,
  params,
}: {
  searchParams: { url: string };
  params: { id: string };
}) {
  const supabaseClient = createServerComponentClient<Database>({ cookies });
  const data = await getDbMetadata(supabaseClient);
  const bookmarkItem = await getBookmark({ supabaseClient, id: params.id });

  return (
    <BookmarkForm
      type="edit"
      tags={data.tags}
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
