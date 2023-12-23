import { OpenAIStream, StreamingTextResponse } from 'ai';
import OpenAI from 'openai';

export const runtime = 'edge';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

const systemPrompt = `You are a web page title rewriter. You will be given a string and you should rewrite it to make it more clear. If the name of the site is separated from the page title using a pipe character ("|"), replace it with a en dash ("–"). Follow the writing style of text, if it doesn't use captilization, don't use it. Only include the rewritten text, nothing extra. Be concise. If the title repeats words or phrases, remove any repitition as long as it makes sense. If the name of the site is already in the correct place, don't change it. Ideally the name of the website should be first. Below are a few examples:

Before: POC Kortal Race Mips Helmet | MTB Helmets                  – POC Sports
After: POC Sports – POC Kortal Race Mips Helmet | MTB Helmets

or

Before: POC Kortal Race Mips Helmet | MTB Helmets | POC Sports
After: POC Sports – POC Kortal Race Mips Helmet | MTB Helmets

or

Before: deck․gallery — nicely designed decks, curated
After: deck․gallery – nicely designed decks, curated

or

Before: GitHub - MrKai77/Loop: MacOS window management made elegant.
After: Loop – MacOS window management made elegant on GitHub.

Before: Clientside - The Platform for Frontend Experts
After: Clientside - The Platform for Frontend Experts

or

Before: Wallace and Gromit™ Christmas Figure– Lights4fun.co.uk
After: Lights4fun.co.uk – Wallace and Gromit™ Christmas Figure

or

Before: Turso | SQLite Developer Experience in an Edge Database
After: Turso – SQLite Developer Experience in an Edge Database`;

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
