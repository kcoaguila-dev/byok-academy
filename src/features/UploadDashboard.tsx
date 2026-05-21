import React, { useState, useCallback } from 'react';
import { extractTextFromPdf } from '../lib/pdfParser';
import { useStore } from '../store/useStore';
import { useOntology } from '../hooks/useOntology';
import { useBYOK } from '../hooks/useBYOK';

export const UploadDashboard: React.FC = () => {
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const { setParsedText } = useStore();
  const { generateSyllabus, loading, error } = useOntology();
  const { apiKey } = useBYOK();

  const processFile = useCallback(async (file: File) => {
    if (file.type !== 'application/pdf') {
      alert('Please upload a PDF file.');
      return;
    }

    if (!apiKey) {
      alert('Please set your API key first.');
      return;
    }

    setIsProcessing(true);
    try {
      const text = await extractTextFromPdf(file);
      setParsedText(text);
      await generateSyllabus(text);
    } catch (err) {
      console.error(err);
      alert('Error processing file');
    } finally {
      setIsProcessing(false);
    }
  }, [apiKey, generateSyllabus, setParsedText]);

  const onDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setIsDragging(false);
      if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        processFile(e.dataTransfer.files[0]);
      }
    },
    [processFile]
  );

  const onDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const onDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] p-8">
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">Welcome to OntoLearn</h1>
        <p className="text-lg text-gray-600 max-w-2xl">
          Upload your PDF materials and let our AI generate a structured syllabus and active learning environment for you. Completely private, client-side processing.
        </p>
      </div>

      <div
        onDrop={onDrop}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        className={`w-full max-w-2xl border-4 border-dashed rounded-xl p-12 text-center transition-colors ${
          isDragging ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400'
        }`}
      >
        {isProcessing || loading ? (
          <div className="space-y-4">
            <div className="animate-spin w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full mx-auto" />
            <p className="text-lg text-gray-700">
              {isProcessing ? 'Extracting text from PDF...' : 'Generating syllabus...'}
            </p>
          </div>
        ) : (
          <div>
            <svg
              className="mx-auto h-12 w-12 text-gray-400 mb-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
              />
            </svg>
            <p className="text-xl text-gray-700 font-medium">
              Drag and drop your PDF here
            </p>
            <p className="text-gray-500 mt-2">or click to browse</p>
            <input
              type="file"
              accept=".pdf"
              className="hidden"
              id="file-upload"
              onChange={(e) => {
                if (e.target.files && e.target.files.length > 0) {
                  processFile(e.target.files[0]);
                }
              }}
            />
            <label
              htmlFor="file-upload"
              className="mt-4 inline-block bg-white px-4 py-2 border border-gray-300 rounded shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 cursor-pointer"
            >
              Select File
            </label>
          </div>
        )}
      </div>

      {error && (
        <div className="mt-4 p-4 bg-red-50 text-red-700 rounded-md max-w-2xl w-full">
          <p className="font-bold">Error generating syllabus:</p>
          <p className="font-mono text-sm mt-1">{error}</p>
        </div>
      )}
    </div>
  );
};
