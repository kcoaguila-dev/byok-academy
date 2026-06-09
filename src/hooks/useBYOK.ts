import { useStore } from '../store/useStore';
import localforage from 'localforage';

export const useBYOK = () => {
  const { apiKey, setApiKey } = useStore();

  const saveApiKey = (key: string) => {
    localforage.setItem('apiKey', key);
    setApiKey(key);
  };

  const removeApiKey = () => {
    localforage.removeItem('apiKey');
    setApiKey('');
  };

  return { apiKey, saveApiKey, removeApiKey };
};
