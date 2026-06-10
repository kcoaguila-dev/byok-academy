import React, { useCallback, useState } from 'react';
import { useStore } from '../store/useStore';
import { extractTextFromPdf } from '../lib/pdfParser';
import { chunkText } from '../lib/chunker';
import { indexDocument, setActiveDocumentId, deleteDocumentIndex } from '../lib/search';
import { useOntology } from '../hooks/useOntology';
import { useToast } from '../components/Toast';
import { useConfirm } from '../components/ConfirmDialog';
import { DataBackup } from '../components/DataBackup';

export const CourseLibrary: React.FC = () => {
  const { apiKey, courses, setActiveCourse, deleteCourse, setParsedText } = useStore();
  const { showToast } = useToast();
  const { generateSyllabus, loading, error } = useOntology();
  const { confirm } = useConfirm();

  const [processingPhase, setProcessingPhase] = useState<'idle' | 'extracting' | 'generating' | 'indexing'>('idle');
  const [progress, setProgress] = useState(0);
  const [isDragging, setIsDragging] = useState(false);

  const processFile = useCallback(async (file: File) => {
    if (file.type !== 'application/pdf') {
      showToast('Please upload a PDF file.', 'error');
      return;
    }

    if (!apiKey) {
      showToast('Please set your API key first.', 'error');
      return;
    }

    setProcessingPhase('extracting');
    setProgress(0);
    try {
      const textArray = await extractTextFromPdf(file, (p) => setProgress(p));
      setParsedText(textArray);

      const fullText = textArray.join('\n\n');
      const chunks = chunkText(fullText);

      setProcessingPhase('generating');
      await generateSyllabus(fullText);

      const newCourseId = useStore.getState().activeCourse?.id;
      if (newCourseId) {
        setProcessingPhase('indexing');
        setProgress(0);
        await indexDocument(chunks, newCourseId, (p) => setProgress(p));
        setActiveDocumentId(newCourseId);
      }
    } catch (err) {
      showToast('Error processing file', 'error');
    } finally {
      setProcessingPhase('idle');
    }
  }, [apiKey, generateSyllabus, setParsedText, showToast]);

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
        <h1 className="text-4xl font-bold text-gray-900 mb-4">Course Library</h1>
        <p className="text-lg text-gray-600 max-w-2xl">
          Select an existing course or upload a new PDF to generate a syllabus.
        </p>
      </div>

      {!apiKey && (
        <div className="w-full max-w-4xl bg-amber-50 border border-amber-200 text-amber-800 p-4 rounded-md mb-6 flex flex-col sm:flex-row items-center justify-between">
          <div className="flex items-center gap-3">
            <svg className="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>An OpenAI API key is required to generate syllabi and quizzes.</span>
          </div>
          <div className="mt-4 sm:mt-0 flex flex-col items-center sm:items-end">
            <button
              disabled
              className="bg-amber-100 text-amber-700 px-4 py-2 rounded-md font-medium cursor-not-allowed opacity-75"
            >
              Open API Settings
            </button>
            <span className="text-xs text-amber-600 mt-1">
              Click API Settings in the top right corner to get started.
            </span>
          </div>
        </div>
      )}

      <div className="w-full max-w-4xl grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Upload New PDF Card */}
        <div
          onDrop={apiKey ? onDrop : undefined}
          onDragOver={apiKey ? onDragOver : undefined}
          onDragLeave={apiKey ? onDragLeave : undefined}
          className={`border-2 border-dashed rounded-xl p-6 flex flex-col items-center justify-center text-center transition-colors min-h-[250px] ${
            !apiKey ? 'border-gray-200 bg-gray-50 opacity-60 cursor-not-allowed' : isDragging ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400 hover:bg-gray-50'
          }`}
        >
          {processingPhase !== 'idle' || loading ? (
            <div className="space-y-4 w-full">
              <div className="animate-spin w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-4" />
              <p className="text-sm text-gray-700 font-medium">
                {processingPhase === 'extracting' ? 'Extracting text...' :
                 processingPhase === 'generating' || loading ? 'Generating syllabus...' :
                 processingPhase === 'indexing' ? 'Indexing document for search...' : 'Processing...'}
              </p>
              {(processingPhase === 'extracting' || processingPhase === 'indexing') && (
                <div className="w-full bg-gray-200 rounded-full h-2 mt-4">
                  <div
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${progress}%` }}
                  ></div>
                  <p className="text-xs text-gray-500 mt-2">{progress}%</p>
                </div>
              )}
            </div>
          ) : (
            <>
              <svg className="w-12 h-12 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              <h3 className="text-xl font-bold text-gray-800 mb-2">Upload New PDF</h3>
              <input
                type="file"
                accept=".pdf"
                className="hidden"
                id="library-file-upload"
                disabled={!apiKey}
                onChange={(e) => {
                  if (e.target.files && e.target.files.length > 0) {
                    processFile(e.target.files[0]);
                  }
                }}
              />
              <label
                htmlFor="library-file-upload"
                className={`inline-block px-4 py-2 text-white rounded-md shadow-sm font-medium ${
                  !apiKey ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700 cursor-pointer'
                }`}
              >
                {apiKey ? 'Select File' : 'Set API key first'}
              </label>
            </>
          )}
        </div>

        {/* Existing Courses */}
        {courses.map((course) => {
          const totalConcepts = course.concepts.length;
          const completedConcepts = course.concepts.filter(c => c.status === 'completed').length;
          const completionPercentage = totalConcepts > 0 ? Math.round((completedConcepts / totalConcepts) * 100) : 0;

          return (
            <div key={course.id} className="border border-gray-200 rounded-xl p-6 bg-white shadow-sm flex flex-col justify-between min-h-[250px]">
              <div>
                <h3 className="text-xl font-bold text-gray-800 mb-2 truncate" title={course.title}>
                  {course.title}
                </h3>
                <p className="text-gray-600 mb-4">{totalConcepts} concepts</p>

                <div className="mb-6">
                  <div className="flex justify-between text-sm text-gray-500 mb-1">
                    <span>Progress</span>
                    <span>{completionPercentage}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-green-500 h-2 rounded-full"
                      style={{ width: `${completionPercentage}%` }}
                    ></div>
                  </div>
                </div>
              </div>

              <div className="flex gap-2 mt-auto">
                <button
                  onClick={() => setActiveCourse(course)}
                  className="flex-1 bg-gray-800 text-white px-4 py-2 rounded-md font-medium hover:bg-gray-900 transition-colors"
                >
                  Load
                </button>
                <button
                  onClick={async () => {
                    if (await confirm('Are you sure you want to delete this course?')) {
                      await deleteDocumentIndex(course.id);
                      deleteCourse(course.id);
                    }
                  }}
                  className="px-4 py-2 border border-red-200 text-red-600 rounded-md font-medium hover:bg-red-50 transition-colors"
                >
                  Delete
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {error && (
        <div className="mt-8 p-4 bg-red-50 text-red-700 rounded-md max-w-2xl w-full text-center">
          <p className="font-bold">Error generating syllabus:</p>
          <p className="font-mono text-sm mt-1">{error}</p>
        </div>
      )}

      <DataBackup />

      {courses.length === 0 && processingPhase === 'idle' && !loading && (
        <div className="mt-8 text-center text-gray-500">
          No courses saved yet. Upload a PDF to get started!
        </div>
      )}
    </div>
  );
};