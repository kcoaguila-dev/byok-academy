export interface Course {
  id: string;
  title: string;
  concepts: Concept[];
}

export interface Concept {
  id: string;
  title: string;
  content: string;
  prerequisites?: string[];
  status: 'pending' | 'in-progress' | 'completed';
}
