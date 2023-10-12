'use client';

import { useSearchParams } from 'next/navigation';

export default function Messages() {
  const searchParams = useSearchParams();
  const error = searchParams.get('error');
  const message = searchParams.get('message');
  return (
    <>
      {error && (
        <p className="mt-4 bg-neutral-900 p-4 text-center text-neutral-300">
          {error}
        </p>
      )}
      {message && (
        <p className="mt-4 bg-neutral-900 p-4 text-center text-neutral-300">
          {message}
        </p>
      )}
    </>
  );
}
