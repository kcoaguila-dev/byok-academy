import React, { useCallback, useState } from 'react';
import { useStore } from '../store/useStore';
import { extractTextFromPdf } from '../lib/pdfParser';
import { chunkText } from '../lib/chunker';
import { indexDocument } from '../lib/search';
import { useOntology } from '../hooks/useOntology';
import { useToast } from '../components/Toast';

export const CourseLibrary: React.FC = () => {
  const { apiKey, courses, selectCourse, deleteCourse, setParsedText } = useStore();
  const { showToast } = useToast();
  const { generateSyllabus, loading, error } = useOntology();

  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);

  const processFile = useCallback(async (file: File) => {
    if (file.type !== 'application/pdf') {
      showToast('Please upload a PDF file.', 'error');
      return;
    }

    if (!apiKey) {
      showToast('Please set your API key first.', 'error');
      return;
    }

    setIsProcessing(true);
    setProgress(0);
    try {
      const textArray = await extractTextFromPdf(file, (p) => setProgress(p));
      setParsedText(textArray);

      const fullText = textArray.join('\n\n');
      const chunks = chunkText(fullText);

      await Promise.all([
        indexDocument(chunks, file.name).then(() => setIsProcessing(false)),
        generateSyllabus(fullText)
      ]);
    } catch (err) {
      showToast('Error processing file', 'error');
    } finally {
      setIsProcessing(false);
    }
  }, [apiKey, generateSyllabus, setParsedText]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] p-8">
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">Course Library</h1>
        <p className="text-lg text-gray-600 max-w-2xl">
          Select an existing course or upload a new PDF to generate a syllabus.
        </p>
      </div>

      <div className="w-full max-w-4xl grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Upload New PDF Card */}
        <div className="border-2 border-dashed border-gray-300 rounded-xl p-6 flex flex-col items-center justify-center text-center hover:border-gray-400 hover:bg-gray-50 transition-colors min-h-[250px]">
          {isProcessing || loading ? (
            <div className="space-y-4 w-full">
              <div className="animate-spin w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-4" />
              <p className="text-sm text-gray-700 font-medium">
                {isProcessing ? 'Extracting text...' : 'Generating syllabus...'}
              </p>
              {isProcessing && (
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
                onChange={(e) => {
                  if (e.target.files && e.target.files.length > 0) {
                    processFile(e.target.files[0]);
                  }
                }}
              />
              <label
                htmlFor="library-file-upload"
                className="inline-block bg-blue-600 px-4 py-2 text-white rounded-md shadow-sm font-medium hover:bg-blue-700 cursor-pointer"
              >
                Select File
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
                  onClick={() => selectCourse(course.id)}
                  className="flex-1 bg-gray-800 text-white px-4 py-2 rounded-md font-medium hover:bg-gray-900 transition-colors"
                >
                  Continue
                </button>
                <button
                  onClick={() => {
                    if (window.confirm('Are you sure you want to delete this course?')) {
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

      {courses.length === 0 && !isProcessing && !loading && (
        <div className="mt-8 text-center text-gray-500">
          No courses saved yet. Upload a PDF to get started!
        </div>
      )}
    </div>
  );
};
