import { describe, it, expect, vi, beforeEach } from 'vitest';
import { callLLM } from './llmRouter';

// Mock the Zustand store
vi.mock('../store/useStore', () => ({
  useStore: {
    getState: vi.fn().mockReturnValue({ useLocalServer: false, localServerUrl: '' }),
  },
}));

describe('llmRouter', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('callLLM', () => {
    it('should correctly call OpenAI endpoint and headers', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          choices: [{ message: { content: 'openai response' } }],
        }),
      });
      globalThis.fetch = mockFetch as any;

      const response = await callLLM('hello', 'test-openai-key', 'gpt-4o-mini');
      expect(response).toBe('openai response');
      expect(mockFetch).toHaveBeenCalledWith('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer test-openai-key',
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [{ role: 'user', content: 'hello' }],
        }),
      });
    });

    it('should correctly call Anthropic endpoint and headers', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          content: [{ text: 'anthropic response' }],
        }),
      });
      globalThis.fetch = mockFetch as any;

      const response = await callLLM('hello', 'test-anthropic-key', 'claude-3');
      expect(response).toBe('anthropic response');
      expect(mockFetch).toHaveBeenCalledWith('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': 'test-anthropic-key',
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: 'claude-3',
          max_tokens: 2048,
          messages: [{ role: 'user', content: 'hello' }],
        }),
      });
    });

    it('should correctly call Gemini endpoint and headers', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          candidates: [{ content: { parts: [{ text: 'gemini response' }] } }],
        }),
      });
      globalThis.fetch = mockFetch as any;

      const response = await callLLM('hello', 'test-gemini-key', 'gemini-1.5-flash');
      expect(response).toBe('gemini response');
      expect(mockFetch).toHaveBeenCalledWith('https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=test-gemini-key', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{ parts: [{ text: 'hello' }] }],
        }),
      });
    });

    it('should throw an error for non-200 responses from OpenAI', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: false,
        statusText: 'Bad Request',
      });
      globalThis.fetch = mockFetch as any;

      await expect(callLLM('hello', 'key', 'gpt-3.5')).rejects.toThrow('OpenAI Error: Bad Request');
    });

    it('should throw an error for non-200 responses from Anthropic', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: false,
        statusText: 'Unauthorized',
      });
      globalThis.fetch = mockFetch as any;

      await expect(callLLM('hello', 'key', 'claude-2')).rejects.toThrow('Anthropic Error: Unauthorized');
    });

    it('should throw an error for non-200 responses from Gemini', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: false,
        statusText: 'Internal Server Error',
      });
      globalThis.fetch = mockFetch as any;

      await expect(callLLM('hello', 'key', 'gemini-pro')).rejects.toThrow('Gemini Error: Internal Server Error');
    });
  });
});
