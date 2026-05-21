import React, { useState } from 'react';
import { useBYOK } from '../hooks/useBYOK';
import { useStore } from '../store/useStore';

export const BYOKSettings: React.FC = () => {
  const { apiKey, saveApiKey, removeApiKey } = useBYOK();
  const { modelName, setModelName } = useStore();
  const [inputKey, setInputKey] = useState(apiKey);
  const [inputModel, setInputModel] = useState(modelName);
  const [isOpen, setIsOpen] = useState(false);

  const handleSave = () => {
    saveApiKey(inputKey);
    setModelName(inputModel);
    setIsOpen(false);
  };

  const handleRemove = () => {
    removeApiKey();
    setInputKey('');
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

        <input
          type="password"
          value={inputKey}
          onChange={(e) => setInputKey(e.target.value)}
          placeholder="sk-..."
          className="w-full border border-gray-300 rounded px-3 py-2 mb-4 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />

        <p className="text-sm text-gray-600 mb-2">Select Target Model</p>
        <select
          value={inputModel}
          onChange={(e) => setInputModel(e.target.value)}
          className="w-full border border-gray-300 rounded px-3 py-2 mb-4 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="gpt-4o-mini">gpt-4o-mini</option>
          <option value="gpt-4o">gpt-4o</option>
          <option value="claude-3-opus">claude-3-opus</option>
        </select>

        <div className="flex justify-end space-x-2">
          {apiKey && (
            <button
              onClick={handleRemove}
              className="px-4 py-2 text-red-600 hover:bg-red-50 rounded transition"
            >
              Clear Key
            </button>
          )}
          <button
            onClick={() => setIsOpen(false)}
            className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded transition"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
};
