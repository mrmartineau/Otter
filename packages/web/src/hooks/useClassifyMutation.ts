import { useMutation } from '@tanstack/react-query'
import { classifyBookmark } from '@/utils/fetching/ai'

export interface ClassifyInput {
  title: string
  description: string
  url: string
  tags: string[]
  currentType: string
}

export const useClassifyMutation = () => {
  return useMutation({
    mutationFn: (data: ClassifyInput) => classifyBookmark(data),
    mutationKey: ['ai', 'classify'],
  })
}
