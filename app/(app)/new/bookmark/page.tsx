import { BookmarkForm } from '@/src/components/BookmarkForm';
import { Database } from '@/src/types/supabase';
import { getDbMetadata } from '@/src/utils/fetching/meta';
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

export default async function NewPage({
  searchParams,
}: {
  searchParams: { url: string };
}) {
  return (
    <BookmarkForm
      type="new"
      initialValues={{
        url: searchParams.url,
      }}
    />
  );
}
