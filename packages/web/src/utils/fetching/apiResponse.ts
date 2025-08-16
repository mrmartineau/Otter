import urlJoin from 'proper-url-join'
import { DEFAULT_API_RESPONSE_LIMIT } from '@/constants'

interface ApiResponseGeneratorResult<T> {
  data: T
  count: number
  limit?: number
  offset?: number
  path: string
}
export const apiResponseGenerator = <T>({
  data,
  limit = DEFAULT_API_RESPONSE_LIMIT,
  count,
  offset = 0,
  path,
}: ApiResponseGeneratorResult<T>) => ({
  _links: {
    next:
      offset + limit > count
        ? null
        : urlJoin(path, {
            query: {
              limit,
              offset: offset + limit,
            },
          }),
    prev:
      offset === 0
        ? null
        : urlJoin(path, {
            query: {
              limit,
              offset: offset - limit - 1 > 0 ? offset - limit - 1 : 0,
            },
          }),
  },
  count,
  data,
  limit,
  offset,
})
