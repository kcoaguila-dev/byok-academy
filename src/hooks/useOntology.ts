import { useState } from 'react';
import { callLLM } from '../lib/llmRouter';
import { useStore } from '../store/useStore';
import type { Course } from '../types';
import { chunkText } from '../lib/chunker';
import { useToast } from '../components/Toast';
import { sanitizeInput } from '../lib/sanitize';

export const useOntology = () => {
  const { apiKey, modelName, setActiveCourse } = useStore();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { showToast } = useToast();

  const generateSyllabus = async (text: string) => {
    setLoading(true);
    setError(null);
    let attempts = 0;
    const maxAttempts = 3;

    while (attempts < maxAttempts) {
      try {
        const chunks = chunkText(text);
        const fullText = chunks.join('\n');

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
${sanitizeInput(fullText)}
        `;

        const response = await callLLM(prompt, apiKey, modelName);
        // Clean up potential markdown formatting
        const cleanJson = response.replace(/```json/g, '').replace(/```/g, '').trim();
        const course: Course = JSON.parse(cleanJson);

        // Replace LLM generated concept content with exact source text via keyword matching
        const paragraphs = fullText.split('\n\n');
        course.concepts = course.concepts.map(concept => {
          const titleWords = concept.title.toLowerCase().match(/\b\w+\b/g) || [];
          let bestParagraph = '';
          let maxMatches = 0;

          paragraphs.forEach(paragraph => {
            const paragraphLower = paragraph.toLowerCase();
            const matches = titleWords.filter(word => paragraphLower.includes(word)).length;
            if (matches > maxMatches) {
              maxMatches = matches;
              bestParagraph = paragraph.trim();
            }
          });

          return {
            ...concept,
            content: maxMatches > 0 ? bestParagraph : concept.content
          };
        });

        useStore.getState().addCourse(course);
        setActiveCourse(course);
        break; // Success, exit loop
      } catch (err) {
        attempts++;
        if (attempts >= maxAttempts) {
          if (err instanceof Error) {
            setError(err.message);
          } else {
            setError('An unknown error occurred');
          }
          showToast('Failed to generate syllabus. Please try again.', 'error');
        }
      }
    }
    setLoading(false);
  };

  return { generateSyllabus, loading, error };
};
