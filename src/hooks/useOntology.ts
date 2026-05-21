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
      // Send the entire text context for ontology generation instead of just the first chunk
      const prompt = `Based on the following text, create a syllabus with concepts. Format the output as a JSON object representing a directed prerequisite graph matching this exact JSON schema:
      {
        "id": "course-id",
        "title": "Course Name",
        "concepts": [
          {
            "id": "c1",
            "title": "Concept Name",
            "content": "Raw text content",
            "prerequisites": ["list-of-parent-concept-ids"],
            "status": "pending"
          }
        ]
      }

      CRITICAL INSTRUCTION: Output ONLY the raw JSON object. Do not wrap the output in markdown code blocks (\`\`\`json ... \`\`\`), do not include any preamble, and do not include any trailing explanation. Your response will be passed directly to JSON.parse().

      Text:
      ${text}
      `;

      const provider = modelName.includes('claude') ? 'anthropic' : 'openai';
      const response = await callLLM(prompt, apiKey, modelName, provider);
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
