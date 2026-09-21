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

type GenerateArgs = {
  systemPrompt: string
  prompt: string
  context: Context
}

const runModel = async ({ context, prompt, systemPrompt }: GenerateArgs) =>
  await context.env.AI.run(AI_MODEL, {
    messages: [
      { content: systemPrompt, role: 'system' },
      { content: prompt, role: 'user' },
    ],
  })

export const generateResponse = async (args: GenerateArgs) =>
  args.context.json(await runModel(args))

/**
 * The same call as `generateResponse`, but handing back the rewritten text
 * instead of an HTTP response, for the save path that has no request to answer.
 */
export const generateText = async (args: GenerateArgs) => {
  const { response } = (await runModel(args)) as { response?: unknown }

  return typeof response === 'string' ? response.trim() : ''
}
