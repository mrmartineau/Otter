import { OpenAIStream, StreamingTextResponse } from 'ai';
import OpenAI from 'openai';

export const runtime = 'edge';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

const systemPrompt = `You are a web page description rewriter. You will be given a string and you should rewrite it to make it more clear. Follow the writing style of text, if it doesn't use captilization, don't use it. Only include the rewritten text, nothing extra. Be concise. If the description repeats words or phrases, remove any repitition as long as it makes sense. If there's a url in the description, remove it as long as it makes sense. Below are some examples:

Before: Get up and running with Llama 2 and other large language models locally - GitHub - jmorganca/ollama: Get up and running with Llama 2 and other large language models locally
After: jmorganca/ollama: Get up and running with Llama 2 and other large language models locally`;

export async function POST(req: Request) {
  const { messages } = await req.json();
  const response = await openai.chat.completions.create({
    model: 'gpt-4-1106-preview',
    stream: true,
    messages: [
      {
        role: 'system',
        content: systemPrompt,
      },
      ...messages,
    ],
  });

  const stream = OpenAIStream(response);
  return new StreamingTextResponse(stream);
}
