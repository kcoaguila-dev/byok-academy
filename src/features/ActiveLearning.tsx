import React from 'react';
import { useStore } from '../store/useStore';

export const ActiveLearning: React.FC = () => {
  const { activeCourse, activeConcept, setActiveConcept } = useStore();

  if (!activeCourse) return null;

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      {/* Sidebar Syllabus */}
      <div className="w-1/4 bg-white border-r border-gray-200 overflow-y-auto">
        <div className="p-4 bg-gray-100 border-b border-gray-200 sticky top-0">
          <h2 className="text-lg font-bold text-gray-800">{activeCourse.title}</h2>
        </div>
        <nav className="p-2 space-y-1">
          {activeCourse.concepts.map((concept) => (
            <button
              key={concept.id}
              onClick={() => setActiveConcept(concept)}
              className={`w-full text-left px-4 py-3 rounded-lg transition-colors ${
                activeConcept?.id === concept.id
                  ? 'bg-blue-50 text-blue-700 font-medium'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <div className="flex items-center justify-between">
                <span>{concept.title}</span>
                {concept.status === 'completed' && (
                  <span className="text-green-500">✓</span>
                )}
              </div>
            </button>
          ))}
        </nav>
      </div>

      {/* Main Content Area - Split Screen */}
      <div className="flex-1 flex">
        {/* Left: Reading Material */}
        <div className="w-1/2 p-8 overflow-y-auto border-r border-gray-200 bg-white">
          {activeConcept ? (
            <div className="max-w-prose mx-auto">
              <h1 className="text-3xl font-bold mb-6">{activeConcept.title}</h1>
              <div className="prose text-gray-800 leading-relaxed">
                {/* Normally we'd render parsed content associated with this concept here. */}
                <p>{activeConcept.content}</p>

                {/* Fallback dummy content */}
                {!activeConcept.content && (
                  <p className="text-gray-500 italic">
                    Content for this concept is loading or currently unavailable. Review the source material.
                  </p>
                )}
              </div>
            </div>
          ) : (
            <div className="h-full flex items-center justify-center text-gray-400">
              Select a concept from the syllabus to begin learning.
            </div>
          )}
        </div>

        {/* Right: Quiz & Interactive Learning */}
        <div className="w-1/2 p-8 overflow-y-auto bg-gray-50">
          {activeConcept ? (
            <div className="max-w-lg mx-auto bg-white p-6 rounded-xl shadow-sm border border-gray-100">
              <h2 className="text-xl font-bold mb-4">Knowledge Check</h2>
              <div className="text-gray-600 mb-6">
                Test your understanding of <strong>{activeConcept.title}</strong>.
              </div>

              {/* Dummy Quiz Interface */}
              <div className="space-y-4">
                <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <p className="font-medium mb-3">What is the primary focus of this concept?</p>
                  <div className="space-y-2">
                    {['Option A', 'Option B', 'Option C', 'Option D'].map((opt, i) => (
                      <label key={i} className="flex items-center p-3 rounded border border-gray-200 hover:bg-gray-100 cursor-pointer transition">
                        <input type="radio" name="quiz" className="mr-3" />
                        <span>{opt}</span>
                      </label>
                    ))}
                  </div>
                </div>
                <button className="w-full py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition">
                  Submit Answer
                </button>
              </div>
            </div>
          ) : (
            <div className="h-full flex items-center justify-center text-gray-400">
              Quizzes and interactions will appear here.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
