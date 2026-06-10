import { describe, it, expect, vi, beforeEach } from 'vitest';
import { callLLM } from './llmRouter';
import { useStore } from '../store/useStore';

// Mock the store
vi.mock('../store/useStore', () => ({
  useStore: {
    getState: vi.fn(),
  },
}));

// Mock global fetch
globalThis.fetch = vi.fn();

describe('callLLM', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('should call OpenAI endpoint by default when local server is not configured', async () => {
    // Setup store mock
    vi.mocked(useStore.getState).mockReturnValue({
      useLocalServer: false,
      localServerUrl: '',
    } as any);

    // Setup fetch mock
    const mockResponse = {
      choices: [{ message: { content: 'Default response' } }],
    };
    vi.mocked(globalThis.fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    } as Response);

    const prompt = 'Hello';
    const apiKey = 'test-api-key';
    const result = await callLLM(prompt, apiKey);

    expect(result).toBe('Default response');
    expect(globalThis.fetch).toHaveBeenCalledWith(
      'https://api.openai.com/v1/chat/completions',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [{ role: 'user', content: prompt }],
        }),
      }
    );
  });

  it('should use the provided modelName', async () => {
    // Setup store mock
    vi.mocked(useStore.getState).mockReturnValue({
      useLocalServer: false,
      localServerUrl: '',
    } as any);

    // Setup fetch mock
    const mockResponse = {
      choices: [{ message: { content: 'Response from custom model' } }],
    };
    vi.mocked(globalThis.fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    } as Response);

    const prompt = 'Test prompt';
    const apiKey = 'test-api-key';
    const customModel = 'custom-model-123';

    const result = await callLLM(prompt, apiKey, customModel);

    expect(result).toBe('Response from custom model');
    expect(globalThis.fetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        body: JSON.stringify({
          model: customModel,
          messages: [{ role: 'user', content: prompt }],
        }),
      })
    );
  });

  it('should use local server URL when configured', async () => {
    // Setup store mock
    const localUrl = 'http://localhost:11434/v1/chat/completions';
    vi.mocked(useStore.getState).mockReturnValue({
      useLocalServer: true,
      localServerUrl: localUrl,
    } as any);

    // Setup fetch mock
    const mockResponse = {
      choices: [{ message: { content: 'Local response' } }],
    };
    vi.mocked(globalThis.fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    } as Response);

    const prompt = 'Hello local';
    const apiKey = 'local-api-key';
    const result = await callLLM(prompt, apiKey);

    expect(result).toBe('Local response');
    expect(globalThis.fetch).toHaveBeenCalledWith(
      localUrl,
      expect.objectContaining({
        method: 'POST',
      })
    );
  });

  it('should throw an error when fetch response is not ok', async () => {
    // Setup store mock
    vi.mocked(useStore.getState).mockReturnValue({
      useLocalServer: false,
      localServerUrl: '',
    } as any);

    // Setup fetch mock for failed request
    vi.mocked(globalThis.fetch).mockResolvedValueOnce({
      ok: false,
      statusText: 'Unauthorized',
    } as Response);

    await expect(callLLM('prompt', 'bad-api-key')).rejects.toThrow('OpenAI Error: Unauthorized');
  });
});
