import React, { useState, useEffect } from 'react';
import { useAccessibilityStore } from '@/store/accessibility';
import { cn } from '@/lib/utils';
import { Volume2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface DyslexiaWrapperProps {
  children: React.ReactNode;
}

export const DyslexiaWrapper: React.FC<DyslexiaWrapperProps> = ({ children }) => {
  const { isDyslexiaMode } = useAccessibilityStore();
  const [mouseY, setMouseY] = useState(0);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMouseY(e.clientY);
    };
    if (isDyslexiaMode) {
      window.addEventListener('mousemove', handleMouseMove);
    }
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [isDyslexiaMode]);

  const speak = (text: string) => {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    window.speechSynthesis.speak(utterance);
  };

  if (!isDyslexiaMode) return <>{children}</>;

  return (
    <div className={cn(
      "dyslexia-mode-active min-h-screen transition-colors duration-500",
      "bg-[#FFFBF0] text-[#333333] font-lexend leading-loose tracking-wider"
    )}>
      {/* Reading Ruler */}
      <div 
        className="fixed left-0 right-0 h-8 bg-primary/20 pointer-events-none z-[100] mix-blend-multiply"
        style={{ top: mouseY - 16 }}
      />
      
      {/* Dimming layers */}
      <div 
        className="fixed inset-x-0 top-0 bg-black/5 pointer-events-none z-[99]"
        style={{ height: Math.max(0, mouseY - 16) }}
      />
      <div 
        className="fixed inset-x-0 bottom-0 bg-black/5 pointer-events-none z-[99]"
        style={{ top: mouseY + 16 }}
      />

      <div className="relative z-10">
        {children}
      </div>

      {/* Global TTS Helper - in a real app we'd use a more sophisticated injection, 
          but for this demo we'll provide the styles and logic */}
      <style dangerouslySetInnerHTML={{ __html: `
        .dyslexia-mode-active h1, 
        .dyslexia-mode-active h2, 
        .dyslexia-mode-active h3, 
        .dyslexia-mode-active p {
          position: relative;
        }
      `}} />
    </div>
  );
};

// Helper component for TTS that can be used in other components
export const ReadAloudButton: React.FC<{ text: string }> = ({ text }) => {
  const { isDyslexiaMode } = useAccessibilityStore();
  
  if (!isDyslexiaMode) return null;

  const handleRead = (e: React.MouseEvent) => {
    e.stopPropagation();
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    window.speechSynthesis.speak(utterance);
  };

  return (
    <Button 
      variant="ghost" 
      size="icon" 
      className="h-6 w-6 rounded-full bg-primary/10 hover:bg-primary/20 ml-2 inline-flex items-center justify-center"
      onClick={handleRead}
      title="Read Aloud"
    >
      <Volume2 className="h-3 w-3 text-primary" />
    </Button>
  );
};
