// import { generateText } from 'ai'
import type { Context } from 'hono'
// import { createWorkersAI } from 'workers-ai-provider'

export const generateResponse = async ({
  context,
  prompt,
  systemPrompt,
}: {
  systemPrompt: string
  prompt: string
  context: Context
}) => {
  const response = await context.env.AI.run('@cf/meta/llama-3.1-8b-instruct', {
    prompt: `${systemPrompt}\n${prompt}`,
  })

  return context.json(response)
  // const workersai = createWorkersAI({ binding: context.env.AI })
  // const result = await generateText({
  //   model: workersai('@cf/openai/gpt-oss-20b'),
  //   prompt: query,
  //   system: systemPrompt,
  // })

  // return context.json(result.text)
}
