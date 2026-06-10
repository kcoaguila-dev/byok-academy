import { useState } from 'react';
import { callLLM } from '../lib/llmRouter';
import { useStore } from '../store/useStore';
import type { Course } from '../types';
import { chunkText } from '../lib/chunker';
import { useToast } from '../components/Toast';
import { sanitizePromptInput } from '../lib/sanitize';

export const useOntology = () => {
  const { apiKey, modelName, setActiveCourse } = useStore();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const { showToast } = useToast();

  const generateSyllabus = async (text: string) => {
    setLoading(true);
    setError(null);
    setRetryCount(0);

    const chunks = chunkText(text);
    const fullText = chunks.join('\n');

    let basePrompt = `Based on the following text, create a syllabus with concepts. Format the output as a JSON object representing a directed prerequisite graph matching this TypeScript interface:
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

${sanitizePromptInput(fullText, 'source_text')}
        `;

    let attempt = 0;
    let success = false;
    let currentPrompt = basePrompt;

    while (attempt < 2 && !success) {
      try {
        const response = await callLLM(currentPrompt, apiKey, modelName);
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

        useStore.getState().saveCourse(course);
        setActiveCourse(course);
        success = true;
      } catch (err) {
        attempt++;
        if (attempt === 1) {
          setRetryCount(1);
          currentPrompt = basePrompt + '\nYour previous response was not valid JSON. Return ONLY a valid JSON array, no markdown, no explanation.';
        } else {
          setError('Could not parse the syllabus. Try a different model or a shorter document.');
          showToast('Could not parse the syllabus. Try a different model or a shorter document.', 'error');
          setRetryCount(0);
        }
      }
    }

    setLoading(false);
  };

  return { generateSyllabus, loading, error, retryCount };
};
