import OpenAI from 'openai';
export const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

export async function embedMany(texts: string[]) {
  const res = await openai.embeddings.create({
    model: 'text-embedding-3-small',
    input: texts
  });
  return res.data.map(d => d.embedding);
}
