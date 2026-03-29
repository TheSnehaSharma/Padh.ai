import { create } from 'zustand';

interface AccessibilityState {
  isADHDMode: boolean;
  isDyslexiaMode: boolean;
  isDarkMode: boolean;
  toggleADHDMode: () => void;
  toggleDyslexiaMode: () => void;
  toggleDarkMode: () => void;
}

export const useAccessibilityStore = create<AccessibilityState>((set) => ({
  isADHDMode: false,
  isDyslexiaMode: false,
  isDarkMode: false,
  toggleADHDMode: () => set((state) => ({ isADHDMode: !state.isADHDMode })),
  toggleDyslexiaMode: () => set((state) => ({ isDyslexiaMode: !state.isDyslexiaMode })),
  toggleDarkMode: () => set((state) => {
    const newMode = !state.isDarkMode;
    if (newMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    return { isDarkMode: newMode };
  }),
}));
