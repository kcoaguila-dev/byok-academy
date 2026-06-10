import React from 'react';
import type { Course, Concept } from '../types';
import { ConceptGraph } from './ConceptGraph';

interface CourseSidebarProps {
  isSidebarOpen: boolean;
  setIsSidebarOpen: (isOpen: boolean) => void;
  viewMode: 'list' | 'graph';
  setViewMode: React.Dispatch<React.SetStateAction<'list' | 'graph'>>;
  activeCourse: Course;
  activeConcept: Concept | null;
  setActiveConcept: (concept: Concept | null) => void;
}

export const CourseSidebar: React.FC<CourseSidebarProps> = ({
  isSidebarOpen,
  setIsSidebarOpen,
  viewMode,
  setViewMode,
  activeCourse,
  activeConcept,
  setActiveConcept,
}) => {
  if (!isSidebarOpen) return null;

  return (
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
  );
};
