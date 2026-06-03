import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Topic, PassPackResponse } from '../types';

interface StudyState {
  topics: Topic[];
  selectedTopicId: string | null;
  passPack: PassPackResponse | null;
  activeTab: string;
  lastGeneratedFileIds: string[];
  topicData: Record<string, PassPackResponse>;
  solvedQuestions: Record<string, string[]>;
  setTopics: (topics: Topic[]) => void;
  setSelectedTopicId: (id: string | null) => void;
  setPassPack: (passPack: PassPackResponse | null) => void;
  setActiveTab: (tab: string) => void;
  setLastGeneratedFileIds: (ids: string[]) => void;
  setTopicData: (topicId: string, data: PassPackResponse) => void;
  clearTopicData: () => void;
  toggleQuestionSolved: (topicId: string, questionId: string) => void;
}

export const useStudyStore = create<StudyState>()(
  persist(
    (set) => ({
      topics: [],
      selectedTopicId: null,
      passPack: null,
      activeTab: 'notes',
      lastGeneratedFileIds: [],
      topicData: {},
      solvedQuestions: {},
      setTopics: (topics) => set({ topics }),
      setSelectedTopicId: (id) => set({ selectedTopicId: id }),
      setPassPack: (passPack) => set({ passPack }),
      setActiveTab: (tab) => set({ activeTab: tab }),
      setLastGeneratedFileIds: (ids) => set({ lastGeneratedFileIds: ids }),
      setTopicData: (topicId, data) => set((state) => ({
        topicData: { ...state.topicData, [topicId]: data }
      })),
      clearTopicData: () => set({ topicData: {} }),
      toggleQuestionSolved: (topicId, questionId) => set((state) => {
        const solved = state.solvedQuestions[topicId] || [];
        const isSolved = solved.includes(questionId);
        return {
          solvedQuestions: {
            ...state.solvedQuestions,
            [topicId]: isSolved ? solved.filter(id => id !== questionId) : [...solved, questionId]
          }
        };
      })
    }),
    {
      name: 'study-storage',
    }
  )
);
