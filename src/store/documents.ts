import { create } from 'zustand';

export interface Document {
  id: string;
  name: string;
  content: string;
  summary?: string;
}

interface DocumentsState {
  documents: Document[];
  addDocument: (doc: Document) => void;
  removeDocument: (id: string) => void;
  clearDocuments: () => void;
  getCombinedContent: () => string;
}

export const useDocumentsStore = create<DocumentsState>((set, get) => ({
  documents: [],
  addDocument: (doc) => set((state) => ({ documents: [...state.documents, doc] })),
  removeDocument: (id) => set((state) => ({ documents: state.documents.filter((d) => d.id !== id) })),
  clearDocuments: () => set({ documents: [] }),
  getCombinedContent: () => {
    return get().documents.map((doc) => `--- Document: ${doc.name} ---\n${doc.content}`).join('\n\n');
  },
}));
