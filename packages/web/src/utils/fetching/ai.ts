import { mutationOptions } from '@tanstack/react-query'

export const rewriteTitle = async (title: string) => {
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
  title?: string
) => {
  const response = await fetch('/api/ai/description', {
    body: JSON.stringify({ prompt: description, title }),
    method: 'POST',
  })
  return response.json()
}

export const rewriteDescriptionOptions = (
  description: string | null,
  title: string | undefined = ''
) => {
  if (!description) {
    return null
  }

  return mutationOptions({
    mutationFn: () => rewriteDescription(description, title),
    mutationKey: ['ai', 'description'],
  })
}
