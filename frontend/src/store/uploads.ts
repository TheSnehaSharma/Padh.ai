import { create } from 'zustand';

export type FileCategory = 'PYQs' | 'Syllabus' | 'Reference Book' | "Teacher's Notes";

export interface FileUpload {
  id: string;
  file: File;
  category: FileCategory | null;
}

interface UploadsState {
  files: FileUpload[];
  addFiles: (files: FileUpload[]) => void;
  removeFile: (id: string) => void;
  setCategory: (id: string, category: FileCategory) => void;
  clearFiles: () => void;
}

export const useUploadsStore = create<UploadsState>((set) => ({
  files: [],
  addFiles: (newFiles) => set((state) => ({ files: [...state.files, ...newFiles] })),
  removeFile: (id) => set((state) => ({ files: state.files.filter((f) => f.id !== id) })),
  setCategory: (id, category) =>
    set((state) => ({
      files: state.files.map((f) => (f.id === id ? { ...f, category } : f)),
    })),
  clearFiles: () => set({ files: [] }),
}));
