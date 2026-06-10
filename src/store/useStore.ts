import { create } from 'zustand';
import type { Course, Concept } from '../types';
import localforage from 'localforage';

interface AppState {
  courses: Course[];
  saveCourse: (course: Course) => void;
  updateCourse: (course: Course) => void;
  deleteCourse: (courseId: string) => void;
  selectCourse: (courseId: string) => void;
  apiKey: string;
  setApiKey: (key: string) => void;
  modelName: string;
  setModelName: (model: string) => void;
  useLocalServer: boolean;
  setUseLocalServer: (use: boolean) => void;
  localServerUrl: string;
  setLocalServerUrl: (url: string) => void;
  parsedText: string[];
  setParsedText: (text: string[]) => void;
  activeCourse: Course | null;
  setActiveCourse: (course: Course | null) => void;
  activeConcept: Concept | null;
  setActiveConcept: (concept: Concept | null) => void;
  completeActiveConcept: () => void;
  resetStore: () => void;
  exportCoursesData: () => string;
  importCoursesData: (json: string) => { success: boolean; error?: string };
}

export const useStore = create<AppState>((set, get) => {
  // Load initial state asynchronously
  localforage.getItem<string[]>('parsedText').then((text) => {
    if (text) set({ parsedText: text });
  });
  localforage.getItem<Course>('activeCourse').then((course) => {
    if (course) set({ activeCourse: course });
  });

  localforage.getItem<Course[]>('courses').then((loadedCourses) => {
    if (loadedCourses) set({ courses: loadedCourses });
  });

  localforage.getItem<string>('apiKey').then((key) => {
    if (key) set({ apiKey: key });
  });

  localforage.getItem<string>('modelName').then((model) => {
    if (model) set({ modelName: model });
  });

  localforage.getItem<boolean>('useLocalServer').then((use) => {
    if (use !== null) set({ useLocalServer: use });
  });

  localforage.getItem<string>('localServerUrl').then((url) => {
    if (url) set({ localServerUrl: url });
  });

  return {
    courses: [],
    saveCourse: (course) => {
      const { courses } = get();
      const updatedCourses = [...courses, course];
      localforage.setItem('courses', updatedCourses);
      set({ courses: updatedCourses });
    },
    updateCourse: (course) => {
      const { courses } = get();
      const updatedCourses = courses.map(c => c.id === course.id ? course : c);
      localforage.setItem('courses', updatedCourses);
      set({ courses: updatedCourses });
    },
    deleteCourse: (courseId) => {
      const { courses } = get();
      const updatedCourses = courses.filter(c => c.id !== courseId);
      localforage.setItem('courses', updatedCourses);
      set({ courses: updatedCourses });
    },
    selectCourse: (courseId) => {
      const { courses } = get();
      const course = courses.find(c => c.id === courseId);
      if (course) {
        let firstUnlocked = course.concepts.find(concept => {
          if (!concept.prerequisites || concept.prerequisites.length === 0) return true;
          return concept.prerequisites.every(prereqId => {
            const prereq = course.concepts.find(c => c.id === prereqId);
            return prereq && prereq.status === 'completed';
          });
        });

        if (!firstUnlocked && course.concepts.length > 0) {
          firstUnlocked = course.concepts[0];
        }

        set({ activeCourse: course, activeConcept: firstUnlocked || null });
        localforage.setItem('activeCourse', course);
      }
    },
    apiKey: '',
    setApiKey: (key) => set({ apiKey: key }),
    modelName: 'gpt-4o-mini',
    setModelName: (model) => {
      localforage.setItem('modelName', model);
      set({ modelName: model });
    },
    useLocalServer: false,
    setUseLocalServer: (use) => {
      localforage.setItem('useLocalServer', use);
      set({ useLocalServer: use });
    },
    localServerUrl: '',
    setLocalServerUrl: (url) => {
      localforage.setItem('localServerUrl', url);
      set({ localServerUrl: url });
    },
    parsedText: [],
    setParsedText: (text) => {
      localforage.setItem('parsedText', text);
      set({ parsedText: text });
    },
    activeCourse: null,
    setActiveCourse: (course) => {
      localforage.setItem('activeCourse', course);
      if (course) {
        get().updateCourse(course);
        set({ activeCourse: course });
      } else {
        set({ activeCourse: null, activeConcept: null });
      }
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
      get().updateCourse(updatedCourse);
      set({
        activeCourse: updatedCourse,
        activeConcept: updatedConcept
      });
    },
    resetStore: async () => {
      await localforage.clear();
      set({
        courses: [],
        parsedText: [],
        activeCourse: null,
        activeConcept: null
      });
    },
    exportCoursesData: () => {
      return JSON.stringify({ version: 1, courses: get().courses }, null, 2);
    },
    importCoursesData: (json: string) => {
      try {
        const parsed = JSON.parse(json);
        if (!parsed || typeof parsed !== 'object' || !Array.isArray(parsed.courses)) {
          return { success: false, error: 'Invalid backup file format.' };
        }

        const validCourses: Course[] = [];
        for (const course of parsed.courses) {
          if (course && typeof course === 'object' && 'id' in course && 'title' in course && Array.isArray(course.concepts)) {
            validCourses.push(course);
          } else {
            return { success: false, error: 'Backup file contains invalid course data.' };
          }
        }

        localforage.setItem('courses', validCourses);
        localforage.removeItem('orama_index');

        const state = get();
        const activeCourseId = state.activeCourse?.id;
        const isActiveCourseImported = validCourses.some(c => c.id === activeCourseId);

        if (activeCourseId && !isActiveCourseImported) {
          state.setActiveCourse(null);
        }

        set({ courses: validCourses });
        return { success: true };
      } catch {
        return { success: false, error: 'Failed to parse backup file.' };
      }
    }
  };
});
