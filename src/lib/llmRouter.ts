import { useStore } from '../store/useStore';

export const validateApiKey = async (
  apiKey: string,
  modelName: string
): Promise<{ valid: boolean; error?: string }> => {
  const { useLocalServer, localServerUrl } = useStore.getState();

  const endpoint =
    useLocalServer && localServerUrl
      ? localServerUrl
      : 'https://api.openai.com/v1/chat/completions';

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: modelName,
        messages: [{ role: 'user', content: 'ping' }],
        max_tokens: 1,
      }),
    });

    if (response.ok) {
      return { valid: true };
    }

    let errorMessage = response.statusText;
    try {
      const data = await response.json();
      if (data && data.error && data.error.message) {
        errorMessage = data.error.message;
      } else if (data && typeof data === 'string') {
        errorMessage = data;
      }
    } catch {
      // Failed to parse JSON, use status text
    }

    return { valid: false, error: errorMessage || 'Invalid API key' };
  } catch (err: any) {
    return { valid: false, error: err.message || 'Network error' };
  }
};

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
