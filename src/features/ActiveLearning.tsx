import React, { useState, useEffect } from 'react';
import { useStore } from '../store/useStore';
import { callLLM } from '../lib/llmRouter';

import { ConceptGraph } from './ConceptGraph';
import localforage from 'localforage';
import { useToast } from '../components/Toast';

interface QuizFeedback {
  isCorrect: boolean;
  hint: string;
}

const sanitizePromptInput = (input: string): string => {
  if (!input) return '';
  return input
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/`/g, '\\`');
};

export const ActiveLearning: React.FC = () => {
  const { apiKey, modelName, activeCourse, activeConcept, setActiveConcept } = useStore();
  const [questions, setQuestions] = useState<string[]>([]);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [viewMode, setViewMode] = useState<'list' | 'graph'>('list');
  const [answers, setAnswers] = useState<string[]>(['', '', '']);
  const [feedback, setFeedback] = useState<(QuizFeedback | null)[]>([null, null, null]);
  const [loadingQuestions, setLoadingQuestions] = useState(false);
  const [gradingIndices, setGradingIndices] = useState<boolean[]>([false, false, false]);
  const [questionsError, setQuestionsError] = useState(false);
  const { showToast } = useToast();

  const generateQuestions = async (context: string) => {
    setLoadingQuestions(true);
    setQuestionsError(false);
    setQuestions([]);
    setAnswers(['', '', '']);
    setFeedback([null, null, null]);
    try {
      const sanitizedContext = sanitizePromptInput(context);
      const prompt = `Based on the following context, generate exactly 3 short, open-ended questions to test the student's understanding.
Format the output as a JSON array of strings. Do not include markdown blocks.
Example: ["Question 1?", "Question 2?", "Question 3?"]

<context>
${sanitizedContext}
</context>`;
      const response = await callLLM(prompt, apiKey, modelName);
      const cleanJson = response.replace(/```json/g, '').replace(/```/g, '').trim();
      const parsedQuestions = JSON.parse(cleanJson);
      if (Array.isArray(parsedQuestions) && parsedQuestions.length === 3) {
        setQuestions(parsedQuestions);
      } else {
        throw new Error('Invalid questions format');
      }
    } catch (e) {
      setQuestionsError(true);
      showToast('Could not generate questions for this concept.', 'error');
    } finally {
      setLoadingQuestions(false);
    }
  };

  useEffect(() => {

    if (activeConcept?.content && apiKey && activeConcept.status !== 'completed') {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      generateQuestions(activeConcept.content);
    } else if (!activeConcept?.content || !apiKey) {

      setQuestions([]);

      setAnswers(['', '', '']);

      setFeedback([null, null, null]);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeConcept?.id, apiKey]);

  const handleAnswerChange = (index: number, val: string) => {
    const newAnswers = [...answers];
    newAnswers[index] = val;
    setAnswers(newAnswers);

    // Clear feedback when typing
    if (feedback[index] !== null) {
      const newFeedback = [...feedback];
      newFeedback[index] = null;
      setFeedback(newFeedback);
    }
  };

  const handleSubmitAnswer = async (index: number) => {
    if (!activeConcept?.content || !apiKey || !questions[index] || !answers[index].trim()) return;

    const newGrading = [...gradingIndices];
    newGrading[index] = true;
    setGradingIndices(newGrading);

    try {
      const sanitizedContext = sanitizePromptInput(activeConcept.content);
      const sanitizedQuestion = sanitizePromptInput(questions[index]);
      const sanitizedAnswer = sanitizePromptInput(answers[index]);

      const prompt = `Is the student's answer correct based on the provided context? If not, provide a 1-sentence hint.
Output ONLY a JSON object matching this schema, without markdown formatting:
{ "isCorrect": boolean, "hint": string }

<context>
${sanitizedContext}
</context>

<question>
${sanitizedQuestion}
</question>

<student_answer>
${sanitizedAnswer}
</student_answer>`;

      const response = await callLLM(prompt, apiKey, modelName);
      const cleanJson = response.replace(/```json/g, '').replace(/```/g, '').trim();
      const parsedFeedback = JSON.parse(cleanJson) as QuizFeedback;

      const newFeedback = [...feedback];
      newFeedback[index] = parsedFeedback;
      setFeedback(newFeedback);

      // Mastery Tracking: if all 3 questions are answered correctly
      if (newFeedback.filter(fb => fb?.isCorrect).length === 3 && activeCourse) {
        const updatedConcepts = activeCourse.concepts.map(c =>
          c.id === activeConcept.id ? { ...c, status: 'completed' as const } : c
        );

        const updatedCourse = { ...activeCourse, concepts: updatedConcepts };

        useStore.getState().setActiveCourse(updatedCourse);
        localforage.setItem('activeCourse', updatedCourse);

        const nextConcept = updatedConcepts.find(c => {
          if (c.status === 'completed') return false;
          if (!c.prerequisites || c.prerequisites.length === 0) return true;
          return c.prerequisites.every(prereqId => {
            const prereq = updatedConcepts.find(p => p.id === prereqId);
            return prereq?.status === 'completed';
          });
        });

        if (nextConcept) {
          useStore.getState().setActiveConcept(nextConcept);
        }
      }
    } catch (e) {
      showToast('Grading failed. Please try again.', 'error');
    } finally {
      const newGradingFinished = [...gradingIndices];
      newGradingFinished[index] = false;
      setGradingIndices(newGradingFinished);
    }
  };

  if (!activeCourse) return null;

  return (
    <div className="flex w-full h-screen bg-white overflow-hidden">
      {/* Sidebar: Course Navigation */}
      {isSidebarOpen && (
        <div className="w-64 flex-shrink-0 bg-gray-50 border-r border-gray-200 flex flex-col h-full">
          <div className="p-4 border-b border-gray-200 bg-white flex justify-between items-center">
            <h2 className="font-bold text-gray-800 truncate" title={activeCourse.title}>{activeCourse.title}</h2>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-2">
            {viewMode === 'graph' ? (
              <ConceptGraph
                course={activeCourse}
                activeConcept={activeConcept}
                onSelectConcept={setActiveConcept}
              />
            ) : (
              activeCourse.concepts.map((c) => {
                const isActive = activeConcept?.id === c.id;
                const isCompleted = c.status === 'completed';
                return (
                  <button
                    key={c.id}
                    onClick={() => setActiveConcept(c)}
                    className={`w-full text-left px-3 py-2 rounded-md text-sm font-medium transition-colors flex items-center justify-between ${
                      isActive
                        ? 'bg-blue-100 text-blue-800'
                        : 'text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    <span className="truncate pr-2" title={c.title}>{c.title}</span>
                    {isCompleted ? (
                      <span className="text-green-500 font-bold">✓</span>
                    ) : (
                      <span className="text-gray-300">○</span>
                    )}
                  </button>
                );
              })
            )}
            {activeCourse.concepts.map((c) => {
              const isActive = activeConcept?.id === c.id;
              const isCompleted = c.status === 'completed';
              const isLocked = !!c.prerequisites?.some(prereqId => {
                const prereq = activeCourse.concepts.find(p => p.id === prereqId);
                return prereq && prereq.status !== 'completed';
              });
              return (
                <button
                  key={c.id}
                  onClick={() => setActiveConcept(c)}
                  disabled={isLocked}
                  className={`w-full text-left px-3 py-2 rounded-md text-sm font-medium transition-colors flex items-center justify-between ${
                    isLocked
                      ? 'text-gray-400 cursor-not-allowed'
                      : isActive
                      ? 'bg-blue-100 text-blue-800'
                      : 'text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  <span className="truncate pr-2">{c.title}</span>
                  {isCompleted ? (
                    <span className="text-green-500 font-bold">✓</span>
                  ) : isLocked ? (
                    <span className="text-gray-400">🔒</span>
                  ) : (
                    <span className="text-gray-300">○</span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        <div className="bg-white border-b border-gray-200 p-2 flex items-center gap-4">
          <button
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="p-2 text-gray-500 hover:bg-gray-100 rounded-md transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>

          <button
            onClick={() => setViewMode(prev => prev === 'list' ? 'graph' : 'list')}
            className="px-3 py-1.5 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
          >
            {viewMode === 'list' ? 'Graph View' : 'List View'}
          </button>
        </div>

        {activeConcept ? (
          <div className="flex flex-1 overflow-hidden">
            {/* Left Column: Reader */}
            <div className="w-1/2 h-full overflow-y-auto border-r border-gray-200 p-8">
        <article className="prose max-w-none">
          <h1 className="text-3xl font-bold mb-6 text-gray-900">{activeConcept.title}</h1>
          <div className="text-gray-800 leading-relaxed whitespace-pre-wrap">
            {activeConcept.content || (
              <span className="text-gray-500 italic">No content available for this concept.</span>
            )}
          </div>
        </article>
      </div>

      {/* Right Column: Interactive Quiz */}
      <div className="w-1/2 h-full overflow-y-auto bg-gray-50 p-8">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-2xl font-bold mb-2 text-gray-800">Knowledge Check</h2>
          <p className="text-gray-600 mb-8">Test your understanding of {activeConcept.title}</p>

          {loadingQuestions ? (
            <div className="text-gray-500 animate-pulse">Generating interactive questions...</div>
          ) : questionsError ? (
            <div className="flex flex-col items-center justify-center space-y-4">
              <p className="text-red-500">Failed to load questions.</p>
              <button
                onClick={() => activeConcept?.content && generateQuestions(activeConcept.content)}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
              >
                Retry
              </button>
            </div>
          ) : questions.length > 0 ? (
            <div className="space-y-8">
              {questions.map((q, i) => {
                const fb = feedback[i];
                let inputBorderColor = 'border-gray-300';
                if (fb) {
                  inputBorderColor = fb.isCorrect ? 'border-green-500' : 'border-red-500';
                }

                return (
                  <div key={i} className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                    <p className="font-medium text-gray-800 mb-3">{q}</p>
                    <textarea
                      value={answers[i]}
                      onChange={(e) => handleAnswerChange(i, e.target.value)}
                      placeholder="Type your answer here..."
                      className={`w-full p-3 rounded-lg border ${inputBorderColor} focus:ring-2 focus:ring-blue-500 focus:outline-none mb-3 resize-none`}
                      rows={3}
                    />

                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <button
                        onClick={() => handleSubmitAnswer(i)}
                        disabled={gradingIndices[i] || !answers[i].trim()}
                        className="px-6 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                      >
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
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center bg-gray-50 text-gray-400">
            Please select a concept from the sidebar to begin learning.
          </div>
        )}
      </div>
    </div>
  );
};
