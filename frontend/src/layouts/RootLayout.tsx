import React, { useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { Navbar } from '@/components/layout/Navbar';
import { useAccessibilityStore } from '@/store/accessibility';
import { cn } from '@/lib/utils';
import { DyslexiaWrapper } from '@/components/a11y/DyslexiaWrapper';
import { ADHDWrapper } from '@/components/a11y/ADHDWrapper';

export const RootLayout = () => {
  const { isDarkMode, isDyslexiaMode } = useAccessibilityStore();

  useEffect(() => {
    const root = document.documentElement;
    
    // Dark mode is handled in the store toggle function but we ensure it syncs here
    if (isDarkMode) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [isDarkMode]);

  return (
    <DyslexiaWrapper>
      <ADHDWrapper>
        <div className={cn(
          "min-h-screen bg-background font-sans antialiased flex flex-col",
          isDyslexiaMode && "font-lexend"
        )}>
          <Navbar />
          <main className="flex-1 w-full">
            <Outlet />
          </main>
        </div>
      </ADHDWrapper>
    </DyslexiaWrapper>
  );
};
