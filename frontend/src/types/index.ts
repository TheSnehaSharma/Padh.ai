export interface Topic {
  id: string;
  name: string;
  frequency: number;
  importance?: string;
  color: string;
  chapter?: string;
}

export interface NotesData {
  content: string;
  sources: string[];
  isAiGenerated: boolean;
  warning?: string;
}

export interface AudioChapter {
  id: number;
  title: string;
  duration: string;
}

export interface AudioTranscript {
  time: number;
  text: string;
}

export interface AudioData {
  id: string;
  title: string;
  chapters: AudioChapter[];
  transcript: AudioTranscript[];
}

export interface PracticeQuestion {
  id: string;
  category: 'Short' | 'Medium' | 'Long';
  question: string;
  answer: string;
  marks: number;
}

export interface TopicAnalysis {
  totalQuestions: string | number;
  yearsAppeared: string[] | number[] | string;
  avgMarks: string | number;
  subtopicDistribution: {
    name: string;
    percentage: number;
  }[];
  mostAskedQuestions: {
    id: number;
    question: string;
    frequency: number;
    years: string[] | number[] | string;
    marks: number;
    type: string;
  }[];
}

export interface PassPackResponse {
  topic: string;
  analysis: TopicAnalysis;
  practice: PracticeQuestion[];
  notes: NotesData;
  audio: AudioData;
  topics?: Topic[];
}
