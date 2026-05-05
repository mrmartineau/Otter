import { useCachedPromise } from '@raycast/utils'
import { useFetchMeta } from './utils/fetchItems'

export function useMeta(execute: boolean = true) {
  const { data, isLoading, revalidate } = useCachedPromise(
    async () => {
      return await useFetchMeta()
    },
    [],
    { execute },
  )

  return { data, isLoading, revalidate }
}
