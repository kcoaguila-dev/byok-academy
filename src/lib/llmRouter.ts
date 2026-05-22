import { useStore } from '../store/useStore';

export const callLLM = async (
  prompt: string,
  apiKey: string,
  modelName: string = 'gpt-4o-mini'
): Promise<string> => {
  const { useLocalServer, localServerUrl } = useStore.getState();

  const endpoint = useLocalServer && localServerUrl ? localServerUrl : 'https://api.openai.com/v1/chat/completions';

  const response = await fetch(endpoint, {
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
