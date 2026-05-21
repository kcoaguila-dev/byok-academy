export const callLLM = async (
  prompt: string,
  apiKey: string,
  modelName: string,
  provider: 'openai' | 'anthropic' = 'openai'
): Promise<string> => {
  if (provider === 'openai') {
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
  } else {
    // Anthropic API Call
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerously-allow-browser': 'true',
      },
      body: JSON.stringify({
        model: modelName,
        max_tokens: 1024,
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    if (!response.ok) {
      throw new Error(`Anthropic Error: ${response.statusText}`);
    }

    const data = await response.json();
    return data.content[0].text;
  }
};
