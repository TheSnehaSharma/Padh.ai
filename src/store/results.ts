import { create } from 'zustand';

export interface Topic {
  name: string;
  probability: number;
}

export interface TwoMark {
  id: number;
  question: string;
  answer: string;
}

export interface FiveMark {
  id: number;
  title: string;
  content: string;
}

export interface TenMark {
  id: number;
  title: string;
  steps: string[];
}

export interface Numerical {
  id: number;
  problem: string;
  solution: string;
}

export interface PassPackData {
  topics: Topic[];
  twoMarks: TwoMark[];
  fiveMarks: FiveMark[];
  tenMarks: TenMark[];
  numericals: Numerical[];
}

interface ResultsState {
  data: PassPackData | null;
  setResults: (data: PassPackData) => void;
  clearResults: () => void;
}

export const useResultsStore = create<ResultsState>((set) => ({
  data: null,
  setResults: (data) => set({ data }),
  clearResults: () => set({ data: null }),
}));
