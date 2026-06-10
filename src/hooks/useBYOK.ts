import { useStore } from '../store/useStore';

export const useBYOK = () => {
  const { apiKey, setApiKey } = useStore();

  const saveApiKey = (key: string) => {
    setApiKey(key);
  };

  const removeApiKey = () => {
    setApiKey('');
  };

  return { apiKey, saveApiKey, removeApiKey };
};
