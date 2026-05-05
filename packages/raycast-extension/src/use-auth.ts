import { useCachedPromise } from '@raycast/utils'
import { authorize } from './api'

export function useAuth() {
  const { isLoading, error } = useCachedPromise(async () => {
    await authorize()
  })

  return { error, isLoading }
}
