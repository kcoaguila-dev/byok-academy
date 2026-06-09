import { useState } from 'react';
import { callLLM } from '../lib/llmRouter';
import { useStore } from '../store/useStore';
import type { Course } from '../types';

export const useOntology = () => {
  const { apiKey, modelName, setActiveCourse } = useStore();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generateSyllabus = async (text: string) => {
    setLoading(true);
    setError(null);
    try {
      const prompt = `Based on the following text, create a syllabus with concepts. Format the output as a JSON object representing a directed prerequisite graph matching this TypeScript interface:
      {
        "id": "course-id",
        "title": "Course Name",
        "concepts": [
          {
            "id": "c1",
            "title": "Concept Name",
            "content": "Detailed text content extracted from the source material",
            "prerequisites": ["list-of-parent-concept-ids"],
            "status": "pending"
          }
        ]
      }

      Make sure the output is ONLY valid JSON.
      Text:
      ${text}
      `;

      const response = await callLLM(prompt, apiKey, modelName);
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
