import { API_HEADERS } from '@/constants'

type Params = { reason: string; error?: string; status: number }
export const errorResponse = ({ reason, error, status }: Params) => {
  return new Response(
    JSON.stringify({
      data: null,
      error,
      reason,
    }),
    {
      headers: API_HEADERS,
      status,
    },
  )
}
