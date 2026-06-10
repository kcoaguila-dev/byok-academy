import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { callLLM } from './llmRouter';
import { useStore } from '../store/useStore';

// Mock the Zustand store
vi.mock('../store/useStore', () => ({
  useStore: {
    getState: vi.fn(),
  },
}));

describe('llmRouter', () => {
  const mockFetch = vi.fn();

  beforeEach(() => {
    vi.stubGlobal('fetch', mockFetch);

    // Default store state mock
    vi.mocked(useStore.getState).mockReturnValue({
      useLocalServer: false,
      localServerUrl: '',
    } as any);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('callLLM', () => {
    const prompt = 'Hello world';
    const apiKey = 'test-api-key';
    const modelName = 'test-model';

    it('should throw an error when response is not ok', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        statusText: 'Internal Server Error',
      });

      await expect(callLLM(prompt, apiKey, modelName)).rejects.toThrow(
        'OpenAI Error: Internal Server Error'
      );
    });

    it('should return content on successful response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          choices: [
            {
              message: {
                content: 'Test response content',
              },
            },
          ],
        }),
      });

      const result = await callLLM(prompt, apiKey, modelName);
      expect(result).toBe('Test response content');
    });
  });
});
