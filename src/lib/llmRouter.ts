export const callLLM = async (
  prompt: string,
  apiKey: string,
  provider: 'openai' | 'anthropic' = 'openai'
): Promise<string> => {
  if (provider === 'anthropic') {
    console.warn('Anthropic direct browser calls are disabled due to CORS. Falling back to OpenAI compatible API.');
  }

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
    }),
  });

  if (!response.ok) {
    throw new Error(`OpenAI Error: ${response.statusText}`);
  }

  const data = await response.json();
  return data.choices[0].message.content;
};
