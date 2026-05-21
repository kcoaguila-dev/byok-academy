import { useEffect } from 'react';
import { useStore } from '../store/useStore';

export const useBYOK = () => {
  const { apiKey, setApiKey } = useStore();

  useEffect(() => {
    const storedKey = localStorage.getItem('byok_api_key');
    if (storedKey) {
      setApiKey(storedKey);
    }
  }, [setApiKey]);

  const saveApiKey = (key: string) => {
    localStorage.setItem('byok_api_key', key);
    setApiKey(key);
  };

  const removeApiKey = () => {
    localStorage.removeItem('byok_api_key');
    setApiKey('');
  };

  return { apiKey, saveApiKey, removeApiKey };
};
