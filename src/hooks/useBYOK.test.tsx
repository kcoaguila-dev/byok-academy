/**
 * @vitest-environment jsdom
 */
import { renderHook, act } from '@testing-library/react';
import { useBYOK } from './useBYOK';
import { useStore } from '../store/useStore';
import { beforeEach, describe, it, expect, vi } from 'vitest';

// Mock the useStore hook
vi.mock('../store/useStore', () => ({
  useStore: vi.fn(),
}));

describe('useBYOK', () => {
  let setApiKeyMock: any;

  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
    setApiKeyMock = vi.fn();
    (useStore as any).mockReturnValue({
      apiKey: 'test-key',
      setApiKey: setApiKeyMock,
    });
  });

  it('should initialize with key from localStorage', () => {
    localStorage.setItem('byok_api_key', 'stored-key');
    const { result } = renderHook(() => useBYOK());

    expect(setApiKeyMock).toHaveBeenCalledWith('stored-key');
    expect(result.current.apiKey).toBe('test-key');
  });

  it('should not update key if localStorage does not have it', () => {
    const { result } = renderHook(() => useBYOK());

    expect(setApiKeyMock).not.toHaveBeenCalled();
    expect(result.current.apiKey).toBe('test-key');
  });

  it('should save API key to localStorage and store', () => {
    const { result } = renderHook(() => useBYOK());

    act(() => {
      result.current.saveApiKey('new-key');
    });

    expect(localStorage.getItem('byok_api_key')).toBe('new-key');
    expect(setApiKeyMock).toHaveBeenCalledWith('new-key');
  });

  it('should remove API key from localStorage and store', () => {
    localStorage.setItem('byok_api_key', 'to-remove');
    const { result } = renderHook(() => useBYOK());

    act(() => {
      result.current.removeApiKey();
    });

    expect(localStorage.getItem('byok_api_key')).toBeNull();
    expect(setApiKeyMock).toHaveBeenCalledWith('');
  });
});
