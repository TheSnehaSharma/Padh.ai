import React from 'react';
import { useAccessibilityStore } from '@/store/accessibility';
import { Button } from '@/components/ui/button';
import { Moon, Sun, Type, Zap, Eye } from 'lucide-react';
import { cn } from '@/lib/utils';

export const AccessibilityControls = () => {
  const { 
    isADHDMode, 
    isDyslexiaMode, 
    isDarkMode, 
    toggleADHDMode, 
    toggleDyslexiaMode, 
    toggleDarkMode 
  } = useAccessibilityStore();

  return (
    <div className="flex items-center gap-2">
      <Button
        variant={isADHDMode ? "default" : "ghost"}
        size="sm"
        onClick={toggleADHDMode}
        title="Toggle ADHD Mode (Focus)"
        className={cn(isADHDMode && "bg-indigo-600 hover:bg-indigo-700")}
      >
        <Zap className="h-4 w-4 mr-2" />
        <span className="hidden sm:inline">ADHD Mode</span>
      </Button>

      <Button
        variant={isDyslexiaMode ? "default" : "ghost"}
        size="sm"
        onClick={toggleDyslexiaMode}
        title="Toggle Dyslexia Mode (Readable Font)"
        className={cn(isDyslexiaMode && "bg-amber-600 hover:bg-amber-700")}
      >
        <Type className="h-4 w-4 mr-2" />
        <span className="hidden sm:inline">Dyslexia Mode</span>
      </Button>

      <Button
        variant="ghost"
        size="icon"
        onClick={toggleDarkMode}
        title="Toggle Dark Mode"
      >
        {isDarkMode ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
      </Button>
    </div>
  );
};
