export const callLLM = async (
  prompt: string,
  apiKey: string,
  modelName: string = 'gpt-4o-mini'
): Promise<string> => {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: modelName,
      messages: [{ role: 'user', content: prompt }],
    }),
  });

  if (!response.ok) {
    throw new Error(`OpenAI Error: ${response.statusText}`);
  }

  const data = await response.json();
  return data.choices[0].message.content;
};
