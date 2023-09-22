'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import urlJoin from 'proper-url-join';
import { useMemo } from 'react';

interface UsePaginationModel {
  offset: number;
  limit: number;
  count: number;
}
export const usePagination = ({ offset, limit, count }: UsePaginationModel) => {
  const router = useRouter();
  const searchParams = useSearchParams();
  console.log(`🚀 ~ usePagination ~ searchParams:`, searchParams);
  const handleUpdateOffset = (newOffset: number) => {
    router.push(
      urlJoin(window.location.href, {
        ...searchParams,
        query: { offset: newOffset.toString(), limit: limit.toString() },
      }),
    );
  };
  const hasOldItems = useMemo(
    () => offset + limit < count,
    [offset, limit, count],
  );
  const hasNewItems = useMemo(() => offset > 0, [offset]);

  return {
    hasNewItems,
    hasOldItems,
    handleUpdateOffset,
  };
};
