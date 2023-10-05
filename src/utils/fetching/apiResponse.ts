import { DEFAULT_API_RESPONSE_LIMIT } from '@/src/constants';
import urlJoin from 'proper-url-join';

interface ApiResponseGeneratorResult<T> {
  data: T;
  count: number;
  limit?: number;
  offset?: number;
  path: string;
}
export const apiResponseGenerator = <T>({
  data,
  limit = DEFAULT_API_RESPONSE_LIMIT,
  count,
  offset = 0,
  path,
}: ApiResponseGeneratorResult<T>) => ({
  offset,
  limit,
  count,
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
  data,
});
