import type { Context } from 'hono'
import { AI_MODEL } from './consts'

export type AiGenerateResponse = {
  response: string
  usage: {
    prompt_tokens: number
    completion_tokens: number
    total_tokens: number
  }
}

export const generateResponse = async ({
  context,
  prompt,
  systemPrompt,
}: {
  systemPrompt: string
  prompt: string
  context: Context
}) => {
  const messages = [
    { content: systemPrompt, role: 'system' },
    {
      content: prompt,
      role: 'user',
    },
  ]
  const response = await context.env.AI.run(AI_MODEL, { messages })

  return context.json(response)
}
