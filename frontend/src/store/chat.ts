import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface Message {
  id: string;
  role: 'user' | 'ai';
  text: string;
  source?: 'search' | 'llm' | 'pdf';
  sourceName?: string;
  sourceUrl?: string;
}

interface ChatState {
  messages: Message[];
  addMessage: (message: Message) => void;
  clearMessages: () => void;
}

export const useChatStore = create<ChatState>()(
  persist(
    (set) => ({
      messages: [
        { id: '1', role: 'ai', text: 'Hi! I\'m your exam assistant. Ask me anything about your syllabus or uploaded papers.', source: 'llm' }
      ],
      addMessage: (message) => set((state) => ({ messages: [...state.messages, message] })),
      clearMessages: () => set({ messages: [] }),
    }),
    {
      name: 'chat-storage',
    }
  )
);
