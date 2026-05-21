import { create } from 'zustand';
import type { Course, Concept } from '../types';
import localforage from 'localforage';

interface AppState {
  apiKey: string;
  setApiKey: (key: string) => void;
  parsedText: string[];
  setParsedText: (text: string[]) => void;
  activeCourse: Course | null;
  setActiveCourse: (course: Course | null) => void;
  activeConcept: Concept | null;
  setActiveConcept: (concept: Concept | null) => void;
  completeActiveConcept: () => void;
}

export const useStore = create<AppState>((set, get) => {
  // Load initial state asynchronously
  localforage.getItem<string[]>('parsedText').then((text) => {
    if (text) set({ parsedText: text });
  });
  localforage.getItem<Course>('activeCourse').then((course) => {
    if (course) set({ activeCourse: course });
  });

  return {
    apiKey: '',
    setApiKey: (key) => set({ apiKey: key }),
    parsedText: [],
    setParsedText: (text) => {
      localforage.setItem('parsedText', text);
      set({ parsedText: text });
    },
    activeCourse: null,
    setActiveCourse: (course) => {
      localforage.setItem('activeCourse', course);
      set({ activeCourse: course });
    },
    activeConcept: null,
    setActiveConcept: (concept) => set({ activeConcept: concept }),
    completeActiveConcept: () => {
      const { activeCourse, activeConcept } = get();
      if (!activeCourse || !activeConcept) return;

      const updatedConcepts = activeCourse.concepts.map(c =>
        c.id === activeConcept.id ? { ...c, status: 'completed' as const } : c
      );

      const updatedCourse = { ...activeCourse, concepts: updatedConcepts };
      const updatedConcept = { ...activeConcept, status: 'completed' as const };

      localforage.setItem('activeCourse', updatedCourse);
      set({
        activeCourse: updatedCourse,
        activeConcept: updatedConcept
      });
    }
  };
});
