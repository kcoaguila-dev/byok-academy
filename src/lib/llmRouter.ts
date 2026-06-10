import { useStore } from '../store/useStore';

export const validateApiKey = async (
  apiKey: string,
  modelName: string
): Promise<{ valid: boolean; error?: string }> => {
  const { useLocalServer, localServerUrl } = useStore.getState();

  let endpoint: string;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let body: any;

  if (modelName.startsWith('claude-')) {
    endpoint = useLocalServer && localServerUrl ? localServerUrl : 'https://api.anthropic.com/v1/messages';
    headers['x-api-key'] = apiKey;
    headers['anthropic-version'] = '2023-06-01';
    body = {
      model: modelName,
      max_tokens: 1,
      messages: [{ role: 'user', content: 'ping' }],
    };
  } else if (modelName.startsWith('gemini-')) {
    endpoint = useLocalServer && localServerUrl ? localServerUrl : `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;
    body = {
      contents: [{ parts: [{ text: 'ping' }] }],
    };
  } else {
    endpoint = useLocalServer && localServerUrl ? localServerUrl : 'https://api.openai.com/v1/chat/completions';
    headers['Authorization'] = `Bearer ${apiKey}`;
    body = {
      model: modelName,
      messages: [{ role: 'user', content: 'ping' }],
      max_tokens: 1,
    };
  }

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
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

  let endpoint: string;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let body: any;

  if (modelName.startsWith('claude-')) {
    endpoint = useLocalServer && localServerUrl ? localServerUrl : 'https://api.anthropic.com/v1/messages';
    headers['x-api-key'] = apiKey;
    headers['anthropic-version'] = '2023-06-01';
    body = {
      model: modelName,
      max_tokens: 2048,
      messages: [{ role: 'user', content: prompt }],
    };
  } else if (modelName.startsWith('gemini-')) {
    endpoint = useLocalServer && localServerUrl ? localServerUrl : `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;
    body = {
      contents: [{ parts: [{ text: prompt }] }],
    };
  } else {
    endpoint = useLocalServer && localServerUrl ? localServerUrl : 'https://api.openai.com/v1/chat/completions';
    headers['Authorization'] = `Bearer ${apiKey}`;
    body = {
      model: modelName,
      messages: [{ role: 'user', content: prompt }],
    };
  }

  const response = await fetch(endpoint, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    if (modelName.startsWith('claude-')) throw new Error(`Anthropic Error: ${response.statusText}`);
    if (modelName.startsWith('gemini-')) throw new Error(`Gemini Error: ${response.statusText}`);
    throw new Error(`OpenAI Error: ${response.statusText}`);
  }

  const data = await response.json();

  if (modelName.startsWith('claude-')) {
    return data.content[0].text;
  } else if (modelName.startsWith('gemini-')) {
    return data.candidates[0].content.parts[0].text;
  } else {
    return data.choices[0].message.content;
  }
};
