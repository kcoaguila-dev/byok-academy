export interface Course {
  id: string;
  title: string;
  concepts: Concept[];
}

export interface Concept {
  id: string;
  title: string;
  content: string;
  prerequisites: string[];
  status: 'pending' | 'in-progress' | 'completed';
}

export interface Quiz {
  id: string;
  conceptId: string;
  questions: Question[];
}

export interface Question {
  id: string;
  text: string;
  options: string[];
  correctAnswerIndex: number;
}
