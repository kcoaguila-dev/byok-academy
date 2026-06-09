import React, { useState, useEffect } from 'react';
import { useStore } from '../store/useStore';
import { callLLM } from '../lib/llmRouter';
import { searchIndex, setActiveDocumentId } from '../lib/search';
import { ConceptGraph } from './ConceptGraph';
import localforage from 'localforage';
import { useToast } from '../components/Toast';
import { sanitizePromptInput } from '../lib/sanitize';

interface QuizFeedback {
  isCorrect: boolean;
  hint: string;
}

export const ActiveLearning: React.FC = () => {
  const { apiKey, modelName, activeCourse, setActiveCourse, activeConcept, setActiveConcept } = useStore();
  const [questions, setQuestions] = useState<string[]>([]);
  const [sourceChunks, setSourceChunks] = useState<string[]>([]);
  const [isSidebarOpen, setIsSidebarOpen] = useState(() => window.innerWidth >= 768);
  const [viewMode, setViewMode] = useState<'list' | 'graph'>('list');

  useEffect(() => {
    const handleResize = () => {
      setIsSidebarOpen(window.innerWidth >= 768);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  const [answers, setAnswers] = useState<string[]>(['', '', '']);
  const [feedback, setFeedback] = useState<(QuizFeedback | null)[]>([null, null, null]);
  const [loadingQuestions, setLoadingQuestions] = useState(false);
  const [gradingIndices, setGradingIndices] = useState<boolean[]>([false, false, false]);
  const [questionsError, setQuestionsError] = useState(false);
  const [showCourseComplete, setShowCourseComplete] = useState(false);
  const { showToast } = useToast();

  useEffect(() => {
    setActiveDocumentId(activeCourse?.id ?? null);
  }, [activeCourse?.id]);

  useEffect(() => {
    setShowCourseComplete(false);
  }, [activeCourse?.id]);

  const generateQuestions = async (context: string) => {
    setLoadingQuestions(true);
    setQuestionsError(false);
    setQuestions([]);
    setSourceChunks([]);
    setAnswers(['', '', '']);
    setFeedback([null, null, null]);
    try {
      let broaderContext = '';
      if (activeConcept?.title && activeCourse?.id) {
        try {
          const results = await searchIndex(activeConcept.title, 3, activeCourse.id);
          if (results && results.length > 0) {
            setSourceChunks(results.map((r: any) => r.text));
            broaderContext = results.map((r: any) => r.text).join('\n\n');
            broaderContext = sanitizePromptInput(broaderContext);
          }
        } catch (e) { /* silently fall back */ }
      }
      const sanitizedContext = sanitizePromptInput(context);
      const prompt = `Based on the following context, generate exactly 3 short, open-ended questions to test the student's understanding.
Format the output as a JSON array of strings. Do not include markdown blocks.
Example: ["Question 1?", "Question 2?", "Question 3?"]

<context>
${sanitizedContext}
</context>
${broaderContext ? '<broader_context>\n' + broaderContext + '\n</broader_context>' : ''}`;
      const response = await callLLM(prompt, apiKey, modelName);
      const cleanJson = response.replace(/\`\`\`json/g, '').replace(/\`\`\`/g, '').trim();
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
      generateQuestions(activeConcept.content);
    } else if (!activeConcept?.content || !apiKey) {
      setQuestions([]);
      setSourceChunks([]);
      setAnswers(['', '', '']);
      setFeedback([null, null, null]);
    }
  }, [activeConcept?.id, apiKey]);

  const handleAnswerChange = (index: number, val: string) => {
    const newAnswers = [...answers];
    newAnswers[index] = val;
    setAnswers(newAnswers);
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
      let broaderContext = '';
      if (activeConcept?.title && activeCourse?.id) {
        try {
          const results = await searchIndex(activeConcept.title, 3, activeCourse.id);
          if (results && results.length > 0) {
            broaderContext = results.map((r: any) => r.text).join('\n\n');
            broaderContext = sanitizePromptInput(broaderContext);
          }
        } catch (e) { /* silently fall back */ }
      }
      const sanitizedContext = sanitizePromptInput(activeConcept.content);
      const sanitizedQuestion = sanitizePromptInput(questions[index]);
      const sanitizedAnswer = sanitizePromptInput(answers[index]);
      const prompt = `Is the student's answer correct based on the provided context? If not, provide a 1-sentence hint.
Output ONLY a JSON object matching this schema, without markdown formatting:
{ "isCorrect": boolean, "hint": string }

<context>
${sanitizedContext}
</context>
${broaderContext ? '<broader_context>\n' + broaderContext + '\n</broader_context>' : ''}

<question>
${sanitizedQuestion}
</question>

<student_answer>
${sanitizedAnswer}
</student_answer>`;
      const response = await callLLM(prompt, apiKey, modelName);
      const cleanJson = response.replace(/\`\`\`json/g, '').replace(/\`\`\`/g, '').trim();
      const parsedFeedback = JSON.parse(cleanJson) as QuizFeedback;
      const newFeedback = [...feedback];
      newFeedback[index] = parsedFeedback;
      setFeedback(newFeedback);
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
          showToast('Concept mastered!', 'success');
          useStore.getState().setActiveConcept(nextConcept);
        } else {
          setShowCourseComplete(true);
        }
      }
    } catch (e) {
      showToast('Grading failed. Please try again.', 'error');
    } finally {
      const done = [...gradingIndices];
      done[index] = false;
      setGradingIndices(done);
    }
  };

  if (!activeCourse) return null;

  return (
    <div className="flex w-full h-screen bg-white overflow-hidden">
      {showCourseComplete && (
        <div className="fixed inset-0 z-50 bg-green-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl p-10 max-w-lg w-full text-center border border-green-100">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <span className="text-4xl text-green-600 font-bold">✓</span>
            </div>
            <h1 className="text-4xl font-extrabold text-gray-900 mb-2">Course Complete!</h1>
            <p className="text-lg text-gray-600 mb-8">
              {activeCourse.title}
              <br />
              <span className="text-sm font-medium text-green-600 mt-2 block">
                {activeCourse.concepts.length} of {activeCourse.concepts.length} concepts mastered
              </span>
            </p>

            <div className="w-full bg-gray-200 rounded-full h-3 mb-10 overflow-hidden">
              <div className="bg-green-500 h-3 rounded-full transition-all duration-1000 ease-out w-full"></div>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button
                onClick={() => {
                  setActiveCourse(null);
                  setShowCourseComplete(false);
                }}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors shadow-sm"
              >
                Back to Library
              </button>
              <button
                onClick={() => setShowCourseComplete(false)}
                className="px-6 py-3 bg-white border-2 border-blue-600 text-blue-600 rounded-lg font-medium hover:bg-blue-50 transition-colors"
              >
                Review Concepts
              </button>
            </div>
          </div>
        </div>
      )}

      {isSidebarOpen && (
        <>
          <div className="fixed inset-0 bg-black bg-opacity-50 z-30 md:hidden" onClick={() => setIsSidebarOpen(false)} />
          <div className="fixed inset-y-0 left-0 z-40 w-64 flex-shrink-0 bg-gray-50 border-r border-gray-200 flex flex-col h-full md:relative md:z-auto">
            <div className="p-4 border-b border-gray-200 bg-white flex justify-between items-center">
            <h2 className="font-bold text-gray-800 truncate" title={activeCourse.title}>{activeCourse.title}</h2>
            <button onClick={() => setViewMode(v => v === 'list' ? 'graph' : 'list')} className="text-xs text-blue-600 hover:underline ml-2 whitespace-nowrap">
              {viewMode === 'list' ? 'Graph View' : 'List View'}
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-2">
            {viewMode === 'graph' ? (
              <ConceptGraph course={activeCourse} activeConcept={activeConcept} onSelectConcept={setActiveConcept} />
            ) : (
              activeCourse.concepts.map((c) => {
                const isActive = activeConcept?.id === c.id;
                const isCompleted = c.status === 'completed';
                const isLocked = !isCompleted && !!c.prerequisites?.some(prereqId => {
                  const prereq = activeCourse.concepts.find(p => p.id === prereqId);
                  return prereq && prereq.status !== 'completed';
                });
                return (
                  <button key={c.id} onClick={() => !isLocked && setActiveConcept(c)} disabled={isLocked}
                    className={`w-full text-left px-3 py-2 rounded-md text-sm font-medium transition-colors flex items-center justify-between ${isLocked ? 'text-gray-400 cursor-not-allowed' : isActive ? 'bg-blue-100 text-blue-800' : 'text-gray-600 hover:bg-gray-200'}`}>
                    <span className="truncate pr-2" title={c.title}>{c.title}</span>
                    {isCompleted ? <span className="text-green-500 font-bold">✓</span> : isLocked ? <span className="text-gray-400">🔒</span> : <span className="text-gray-300">○</span>}
                  </button>
                );
              })
            )}
          </div>
        </div>
        </>
      )}
      <div className="flex-1 flex flex-col min-w-0">
        <div className="bg-white border-b border-gray-200 p-2 flex items-center gap-4">
          <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-2 text-gray-500 hover:bg-gray-100 rounded-md transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
          </button>
          <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors md:hidden">
            Concepts
          </button>
          <button onClick={() => setActiveCourse(null)} className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors flex items-center">
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
            Back to Library
          </button>
        </div>
        {activeConcept ? (
          <div className="flex flex-col md:flex-row flex-1 overflow-hidden">
            <div className="w-full md:w-1/2 min-h-[50vh] md:h-full overflow-y-auto md:border-r border-b md:border-b-0 border-gray-200 p-8">
              <article className="prose max-w-none">
                <h1 className="text-3xl font-bold mb-6 text-gray-900">{activeConcept.title}</h1>
                <div className="text-gray-800 leading-relaxed whitespace-pre-wrap">
                  {activeConcept.content || <span className="text-gray-500 italic">No content available.</span>}
                </div>
              </article>
            </div>
            <div className="w-full md:w-1/2 min-h-[50vh] md:h-full overflow-y-auto bg-gray-50 p-8">
              <div className="max-w-2xl mx-auto">
                <h2 className="text-2xl font-bold mb-2 text-gray-800">Knowledge Check</h2>
                <p className="text-gray-600 mb-8">Test your understanding of {activeConcept.title}</p>
                {loadingQuestions ? (
                  <div className="text-gray-500 animate-pulse">Generating interactive questions...</div>
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
