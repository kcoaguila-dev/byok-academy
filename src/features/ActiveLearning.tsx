import React, { useState, useEffect } from 'react';
import { useStore } from '../store/useStore';
import { callLLM } from '../lib/llmRouter';
import { searchIndex, setActiveDocumentId } from '../lib/search';
import localforage from 'localforage';
import { useToast } from '../components/Toast';
import { sanitizePromptInput } from '../lib/sanitize';
import { CourseSidebar } from './CourseSidebar';
import { SourcePanel } from './SourcePanel';
import { QuizPanel, type QuizFeedback } from './QuizPanel';

export const ActiveLearning: React.FC = () => {
  const { apiKey, modelName, activeCourse, setActiveCourse, activeConcept, setActiveConcept } = useStore();
  const [questions, setQuestions] = useState<string[]>([]);
  const [sourceChunks, setSourceChunks] = useState<string[]>([]);
  const [sourcePassages, setSourcePassages] = useState<string[]>([]);
  const [isSidebarOpen, setIsSidebarOpen] = useState(() => window.innerWidth >= 768);
  const [viewMode, setViewMode] = useState<'list' | 'graph'>('list');
  const [activeTab, setActiveTab] = useState<'source' | 'quiz'>('quiz');

  useEffect(() => {
    const fetchSourcePassages = async () => {
      if (activeConcept?.title && activeCourse?.id) {
        try {
          const results = await searchIndex(activeConcept.title, 5, activeCourse.id);

          setSourcePassages(results.map(r => r.text));
        } catch {
          setSourcePassages([]);
        }
      } else {
        setSourcePassages([]);
      }
    };
    fetchSourcePassages();
  }, [activeConcept?.id, activeCourse?.id]);

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

  const fetchBroaderContext = async (title: string | undefined, courseId: string | undefined): Promise<{ contextText: string, chunks: string[] }> => {
    let contextText = '';
    let chunks: string[] = [];
    if (title && courseId) {
      try {
        const results = await searchIndex(title, 3, courseId);
        if (results && results.length > 0) {
          chunks = results.map((r: any) => r.text);
          contextText = sanitizePromptInput(chunks.join('\n\n'));
        }
      } catch (e) { /* silently fall back */ }
    }
    return { contextText, chunks };
  };

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
      const { contextText: broaderContext, chunks } = await fetchBroaderContext(activeConcept?.title, activeCourse?.id);
      if (chunks.length > 0) {
        setSourceChunks(chunks);
      }

      const sanitizedContext = sanitizePromptInput(context, 'context');
      const prompt = `Based on the following context, generate exactly 3 short, open-ended questions to test the student's understanding.
Format the output as a JSON array of strings. Do not include markdown blocks.
Example: ["Question 1?", "Question 2?", "Question 3?"]

Please explicitly derive the questions from the <broader_context> block when it is present. Only fall back to using <context> if the broader context is empty.

${sanitizedContext}

<broader_context>
${broaderContext}
</broader_context>`;
      const response = await callLLM(prompt, apiKey, modelName);
      const cleanJson = response.replace(/\`\`\`json/g, '').replace(/\`\`\`/g, '').trim();
      const parsedQuestions = JSON.parse(cleanJson);
      if (Array.isArray(parsedQuestions) && parsedQuestions.length === 3) {
        setQuestions(parsedQuestions);
      } else {
        throw new Error('Invalid questions format');
      }
    } catch {
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
  }, [activeConcept?.id, activeConcept?.content, activeConcept?.status, apiKey]);

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
      const { contextText: broaderContext } = await fetchBroaderContext(activeConcept?.title, activeCourse?.id);

      const sanitizedContext = sanitizePromptInput(activeConcept.content, 'context');
      const sanitizedQuestion = sanitizePromptInput(questions[index], 'question');
      const sanitizedAnswer = sanitizePromptInput(answers[index], 'student_answer');
      const prompt = `Is the student's answer correct based on the provided context? If not, provide a 1-sentence hint.
Evaluate the answer against both <context> and <broader_context> when available. In the hint, cite whether the correct answer comes from <context> or <broader_context>.
Output ONLY a JSON object matching this schema, without markdown formatting:
{ "isCorrect": boolean, "hint": string }

${sanitizedContext}

<broader_context>
${broaderContext}
</broader_context>

${sanitizedQuestion}

${sanitizedAnswer}`;
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
    } catch {
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

      <CourseSidebar
        isSidebarOpen={isSidebarOpen}
        setIsSidebarOpen={setIsSidebarOpen}
        viewMode={viewMode}
        setViewMode={setViewMode}
        activeCourse={activeCourse}
        activeConcept={activeConcept}
        setActiveConcept={setActiveConcept}
      />
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
          <div className="flex flex-col flex-1 overflow-hidden">
            <div className="flex md:hidden border-b border-gray-200 bg-white">
              <button
                className={`flex-1 py-3 text-sm font-medium border-b-2 text-center transition-colors ${activeTab === 'source' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                onClick={() => setActiveTab('source')}
              >
                Source
              </button>
              <button
                className={`flex-1 py-3 text-sm font-medium border-b-2 text-center transition-colors ${activeTab === 'quiz' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                onClick={() => setActiveTab('quiz')}
              >
                Quiz
              </button>
            </div>
            <div className="flex flex-col md:flex-row flex-1 overflow-hidden">
            <SourcePanel
              activeConcept={activeConcept}
              sourcePassages={sourcePassages}
              className={`${activeTab === 'source' ? 'block' : 'hidden'} md:block`}
            />
            <QuizPanel
              activeConcept={activeConcept}
              activeCourse={activeCourse}
              className={`${activeTab === 'quiz' ? 'block' : 'hidden'} md:block`}
              questions={questions}
              loadingQuestions={loadingQuestions}
              questionsError={questionsError}
              sourceChunks={sourceChunks}
              answers={answers}
              handleAnswerChange={handleAnswerChange}
              handleSubmitAnswer={handleSubmitAnswer}
              gradingIndices={gradingIndices}
              feedback={feedback}
              generateQuestions={generateQuestions}
              setActiveCourse={setActiveCourse}
              setActiveConcept={setActiveConcept}
            />
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
