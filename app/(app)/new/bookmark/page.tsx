import { BookmarkForm } from '@/src/components/BookmarkForm';

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
