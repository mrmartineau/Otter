import { BookmarkForm } from '@/src/components/BookmarkForm';

export default async function NewPage(
  props: {
    searchParams: Promise<{ url: string }>;
  }
) {
  const searchParams = await props.searchParams;
  return (
    <BookmarkForm
      type="new"
      initialValues={{
        url: searchParams.url,
      }}
    />
  );
}
