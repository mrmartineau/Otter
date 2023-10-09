import { API_HEADERS } from '@/src/constants';

type Params = { reason: string; error?: string; status: number };
export const errorResponse = ({ reason, error, status }: Params) => {
  return new Response(
    JSON.stringify({
      reason,
      error,
      data: null,
    }),
    {
      status,
      headers: API_HEADERS,
    },
  );
};
