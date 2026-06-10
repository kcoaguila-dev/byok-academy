import React from 'react';
import type { Concept } from '../types';

interface SourcePanelProps {
  activeConcept: Concept;
  sourcePassages: string[];
}

export const SourcePanel: React.FC<SourcePanelProps> = ({ activeConcept, sourcePassages }) => {
  return (
    <div className="w-full md:w-1/2 min-h-[50vh] md:h-full overflow-y-auto md:border-r border-b md:border-b-0 border-gray-200 p-8">
      <article className="prose max-w-none">
        <h1 className="text-3xl font-bold mb-6 text-gray-900">{activeConcept.title}</h1>
        {sourcePassages.length > 0 ? (
          sourcePassages.map((passage, idx) => (
            <blockquote key={idx} className="border-l-4 border-gray-200 pl-4 mb-4 text-gray-800 leading-relaxed whitespace-pre-wrap">
              {passage}
            </blockquote>
          ))
        ) : !activeConcept.content ? (
          <div className="animate-pulse space-y-4">
            <div className="h-24 bg-gray-200 rounded w-full"></div>
            <div className="h-24 bg-gray-200 rounded w-full"></div>
          </div>
        ) : (
          <div className="text-gray-800 leading-relaxed whitespace-pre-wrap">
            {activeConcept.content}
          </div>
        )}
      </article>
    </div>
  );
};
