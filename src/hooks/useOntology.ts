import { useState } from 'react';
import { callLLM } from '../lib/llmRouter';
import { useStore } from '../store/useStore';
import type { Course } from '../types';
import { chunkText } from '../lib/chunker';

export const useOntology = () => {
  const { apiKey, setActiveCourse } = useStore();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generateSyllabus = async (text: string) => {
    setLoading(true);
    setError(null);
    try {
      const chunks = chunkText(text);
      const firstChunk = chunks.length > 0 ? chunks[0] : '';

      const prompt = `Based on the following text, create a syllabus with concepts. Format the output as a JSON object matching this TypeScript interface:
      {
        id: string,
        title: string,
        concepts: [
          { id: string, title: string, content: string, status: "pending" | "in-progress" | "completed" }
        ]
      }

      Text:
      ${firstChunk}
      `;

      const response = await callLLM(prompt, apiKey);
      // Clean up potential markdown formatting
      const cleanJson = response.replace(/```json/g, '').replace(/```/g, '').trim();
      const course: Course = JSON.parse(cleanJson);
      setActiveCourse(course);
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('An unknown error occurred');
      }
    } finally {
      setLoading(false);
    }
  };

  return { generateSyllabus, loading, error };
};
