'use client';

import { Button } from '@/src/components/Button';
import { Flex } from '@/src/components/Flex';
import { useEffect } from 'react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error(error);
  }, [error]);

  return (
    <Flex direction="column" gap="m" align="start">
      <h2>Something went wrong!</h2>
      <p>Check the JS console</p>
      <Button
        onClick={
          // Attempt to recover by trying to re-render the segment
          () => reset()
        }
      >
        Try again
      </Button>
    </Flex>
  );
}
