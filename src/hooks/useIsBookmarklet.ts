import { useSearchParams } from 'next/navigation';

export const useIsBookmarklet = (): boolean => {
  const searchParams = useSearchParams();
  const bookmarklet = searchParams.get('bookmarklet');
  console.log(`🚀 ~ useIsBookmark ~ bookmarklet:`, bookmarklet);
  return bookmarklet === 'true';
};
