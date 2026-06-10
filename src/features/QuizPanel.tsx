import React from 'react';
import type { Course, Concept } from '../types';
import localforage from 'localforage';

export interface QuizFeedback {
  isCorrect: boolean;
  hint: string;
}

interface QuizPanelProps {
  activeConcept: Concept;
  activeCourse: Course;
  questions: string[];
  loadingQuestions: boolean;
  questionsError: boolean;
  sourceChunks: string[];
  answers: string[];
  handleAnswerChange: (index: number, val: string) => void;
  handleSubmitAnswer: (index: number) => Promise<void>;
  gradingIndices: boolean[];
  feedback: (QuizFeedback | null)[];
  generateQuestions: (content: string) => Promise<void>;
  setActiveCourse: (course: Course | null) => void;
  setActiveConcept: (concept: Concept | null) => void;
}

export const QuizPanel: React.FC<QuizPanelProps> = ({
  activeConcept,
  activeCourse,
  questions,
  loadingQuestions,
  questionsError,
  sourceChunks,
  answers,
  handleAnswerChange,
  handleSubmitAnswer,
  gradingIndices,
  feedback,
  generateQuestions,
  setActiveCourse,
  setActiveConcept,
}) => {
  return (
    <div className="w-full md:w-1/2 min-h-[50vh] md:h-full overflow-y-auto bg-gray-50 p-8">
      <div className="max-w-2xl mx-auto">
        <h2 className="text-2xl font-bold mb-2 text-gray-800">Knowledge Check</h2>
        <p className="text-gray-600 mb-8">Test your understanding of {activeConcept.title}</p>
        {loadingQuestions ? (
          <div className="space-y-8">
            {[0, 1, 2].map((i) => (
              <div key={i} className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 animate-pulse">
                <div className="h-5 bg-gray-200 rounded w-3/4 mb-3"></div>
                <div className="h-24 bg-gray-200 rounded-lg w-full mb-3"></div>
              </div>
            ))}
          </div>
        ) : questionsError ? (
          <div className="flex flex-col items-center justify-center space-y-4">
            <p className="text-red-500">Failed to load questions.</p>
            <button onClick={() => activeConcept?.content && generateQuestions(activeConcept.content)} className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition">Retry</button>
          </div>
        ) : activeConcept.status === 'completed' ? (
          <div className="flex flex-col items-center justify-center space-y-6 py-8">
            <div className="bg-green-100 text-green-800 px-6 py-4 rounded-xl shadow-sm border border-green-200 flex items-center gap-3">
              <span className="text-2xl font-bold">✓</span>
              <span className="text-lg font-semibold">Concept Mastered</span>
            </div>
            <p className="text-gray-600 text-center">You've completed all knowledge checks for this concept.</p>
            <button onClick={() => {
              if (!activeCourse) return;
              const updatedConcepts = activeCourse.concepts.map(c =>
                c.id === activeConcept.id ? { ...c, status: 'pending' as const } : c
              );
              const updatedCourse = { ...activeCourse, concepts: updatedConcepts };
              const updatedConcept = { ...activeConcept, status: 'pending' as const };
              setActiveCourse(updatedCourse);
              setActiveConcept(updatedConcept);
              localforage.setItem('activeCourse', updatedCourse);
              if (activeConcept.content) {
                generateQuestions(activeConcept.content);
              }
            }} className="px-6 py-2 bg-white border border-blue-600 text-blue-600 rounded-lg font-medium hover:bg-blue-50 transition">
              Practice Again
            </button>
          </div>
        ) : questions.length > 0 ? (
          <div className="space-y-8">
            {sourceChunks.length > 0 && (
              <details className="mb-6 bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                <summary className="cursor-pointer text-sm font-medium text-gray-700 hover:text-gray-900">
                  View source context ({sourceChunks.length} excerpts)
                </summary>
                <div className="mt-4 space-y-3">
                  {sourceChunks.map((chunk, idx) => (
                    <div key={idx} className="p-3 border border-gray-200 rounded-md bg-gray-50 text-sm text-gray-600">
                      {chunk.length > 200 ? chunk.substring(0, 200) + '...' : chunk}
                    </div>
                  ))}
                </div>
              </details>
            )}
            {questions.map((q, i) => {
              const fb = feedback[i];
              const border = fb ? (fb.isCorrect ? 'border-green-500' : 'border-red-500') : 'border-gray-300';
              return (
                <div key={i} className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                  <p className="font-medium text-gray-800 mb-3">{q}</p>
                  <textarea value={answers[i]} onChange={(e) => handleAnswerChange(i, e.target.value)} placeholder="Type your answer here..." className={`w-full p-3 rounded-lg border ${border} focus:ring-2 focus:ring-blue-500 focus:outline-none mb-3 resize-none`} rows={3} />
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <button onClick={() => handleSubmitAnswer(i)} disabled={gradingIndices[i] || !answers[i].trim()} className="px-6 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed">
                      {gradingIndices[i] ? 'Grading...' : 'Submit Answer'}
                    </button>
                    {fb && (
                      <div className={`flex-1 p-3 rounded-lg text-sm ${fb.isCorrect ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}>
                        <span className="font-semibold mr-1">{fb.isCorrect ? 'Correct!' : 'Incorrect.'}</span>
                        {fb.hint && <span>{fb.hint}</span>}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-gray-500">No questions available.</div>
        )}
      </div>
    </div>
  );
};
