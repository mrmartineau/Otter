import { useCachedPromise } from '@raycast/utils'
import { fetchMeta } from './utils/fetchItems'

export function useMeta() {
  const { data, isLoading, revalidate } = useCachedPromise(async () => {
    return await fetchMeta()
  }, [])

  return { data, isLoading, revalidate }
}
