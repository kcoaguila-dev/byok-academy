import React, { useState } from 'react';
import { useBYOK } from '../hooks/useBYOK';
import { useStore } from '../store/useStore';
import { useConfirm } from '../components/ConfirmDialog';
import { useToast } from '../components/Toast';
import { validateApiKey } from '../lib/llmRouter';

export const BYOKSettings: React.FC = () => {
  const { apiKey, saveApiKey, removeApiKey } = useBYOK();
  const { confirm } = useConfirm();
  const { showToast } = useToast();
  const { resetStore, modelName, setModelName, useLocalServer, setUseLocalServer, localServerUrl, setLocalServerUrl } = useStore();
  const [inputKey, setInputKey] = useState(apiKey);
  const [inputModel, setInputModel] = useState(modelName);
  const [inputUseLocal, setInputUseLocal] = useState(useLocalServer);
  const [inputLocalUrl, setInputLocalUrl] = useState(localServerUrl);
  const [isOpen, setIsOpen] = useState(false);
  const [isValidating, setIsValidating] = useState(false);

  // Update local state when opening settings if modelName changed externally
  React.useEffect(() => {
    if (isOpen) {
      // Intentionally syncing local state with store on open.
      // Ignoring lint rule because we need this to reset inputs when modal opens.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setInputKey(apiKey || '');

      setInputModel(modelName);

      setInputUseLocal(useLocalServer);

      setInputLocalUrl(localServerUrl);
    }
  }, [isOpen, apiKey, modelName, useLocalServer, localServerUrl]);

  const handleSave = async () => {
    if (inputKey) {
      setIsValidating(true);
      const { valid, error } = await validateApiKey(inputKey, inputModel);
      setIsValidating(false);

      if (!valid) {
        showToast(error ?? 'Invalid API key', 'error');
        return; // Do NOT close the modal or save the key
      }
    }

    saveApiKey(inputKey);
    setModelName(inputModel);
    setUseLocalServer(inputUseLocal);
    setLocalServerUrl(inputLocalUrl);
    setIsOpen(false);
  };

  const handleRemove = () => {
    removeApiKey();
    setInputKey('');
  };

  const handleResetPlatform = async () => {
    if (await confirm("Are you sure you want to reset the platform? This will delete all courses and progress.")) {
      resetStore();
      setIsOpen(false);
    }
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed top-4 right-4 bg-blue-600 text-white px-4 py-2 rounded shadow hover:bg-blue-700 transition"
      >
        API Settings
      </button>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg p-6 max-w-md w-full shadow-xl">
        <h2 className="text-xl font-bold mb-4">BYOK Settings</h2>
        <p className="text-sm text-gray-600 mb-4">
          Enter your API key. Keys are stored locally in your browser.
        </p>

        <label className="block text-sm font-medium text-gray-700 mb-1">OpenAI API Key</label>
        <input
          type="password"
          value={inputKey}
          onChange={(e) => setInputKey(e.target.value)}
          placeholder="sk-..."
          className="w-full border border-gray-300 rounded px-3 py-2 mb-4 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />

        <label className="block text-sm font-medium text-gray-700 mb-1">Target Model</label>
        <select
          value={inputModel}
          onChange={(e) => setInputModel(e.target.value)}
          className="w-full border border-gray-300 rounded px-3 py-2 mb-4 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="gpt-4o-mini">GPT-4o Mini (Default, Fast)</option>
          <option value="gpt-4o">GPT-4o (Advanced)</option>
          <option value="gpt-4-turbo">GPT-4 Turbo</option>
          <option value="gpt-3.5-turbo">GPT-3.5 Turbo</option>
        </select>

        <div className="mb-4">
          <label className="flex items-center space-x-2 text-sm font-medium text-gray-700">
            <input
              type="checkbox"
              checked={inputUseLocal}
              onChange={(e) => setInputUseLocal(e.target.checked)}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span>Route to Local Network Server</span>
          </label>
        </div>

        {inputUseLocal && (
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Local Server URL</label>
            <input
              type="text"
              value={inputLocalUrl}
              onChange={(e) => setInputLocalUrl(e.target.value)}
              placeholder="http://localhost:11434/v1/chat/completions"
              className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <p className="text-xs text-gray-500 mt-1">
              Ensure your local server is configured for CORS to allow cross-origin requests from GitHub Pages.
            </p>
          </div>
        )}

        <div className="flex justify-between items-center mt-6">
          <button
            onClick={handleResetPlatform}
            className="px-4 py-2 text-red-600 border border-red-200 hover:bg-red-50 rounded transition"
          >
            Reset Platform
          </button>

          <div className="flex justify-end space-x-2">
            {apiKey && (
              <button
                onClick={handleRemove}
                disabled={isValidating}
                className="px-4 py-2 text-red-600 hover:bg-red-50 rounded transition disabled:opacity-50"
              >
                Clear Key
              </button>
            )}
            <button
            onClick={() => setIsOpen(false)}
            disabled={isValidating}
            className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded transition disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={isValidating}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition disabled:opacity-50"
            >
              {isValidating ? 'Validating...' : 'Save'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
