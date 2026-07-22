import { mutationOptions } from '@tanstack/react-query'
import type { AiClassifyResponse } from '../../../worker/ai/classify'
import type { AiGenerateResponse } from '../../../worker/ai/generateResponse'

export const rewriteTitle = async (
  title: string,
): Promise<AiGenerateResponse> => {
  const response = await fetch('/api/ai/title', {
    body: JSON.stringify({ prompt: title }),
    method: 'POST',
  })
  return response.json()
}

export const rewriteTitleOptions = (title: string | null) => {
  if (!title) {
    return null
  }
  return mutationOptions({
    mutationFn: () => rewriteTitle(title),
    mutationKey: ['ai', 'title'],
  })
}

export const rewriteDescription = async (
  description: string,
  title?: string,
): Promise<AiGenerateResponse> => {
  const response = await fetch('/api/ai/description', {
    body: JSON.stringify({ prompt: description, title }),
    method: 'POST',
  })
  return response.json()
}

export const rewriteDescriptionOptions = (
  description: string | null,
  title: string | undefined = '',
) => {
  if (!description) {
    return null
  }

  return mutationOptions({
    mutationFn: () => rewriteDescription(description, title),
    mutationKey: ['ai', 'description'],
  })
}

export const classifyBookmark = async (data: {
  title: string
  description: string
  url: string
  tags: string[]
  currentType: string
}): Promise<AiClassifyResponse> => {
  const response = await fetch('/api/ai/classify', {
    body: JSON.stringify(data),
    method: 'POST',
  })
  return response.json()
}

export const classifyBookmarkOptions = (data: {
  title: string
  description: string
  url: string
  tags: string[]
  currentType: string
}) => {
  return mutationOptions({
    mutationFn: () => classifyBookmark(data),
    mutationKey: ['ai', 'classify'],
  })
}
