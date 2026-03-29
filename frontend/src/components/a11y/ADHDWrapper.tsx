import React, { useState, useEffect } from 'react';
import { useAccessibilityStore } from '@/store/accessibility';
import { motion, MotionConfig } from 'motion/react';
import { Progress } from '@/components/ui/progress';

interface ADHDWrapperProps {
  children: React.ReactNode;
}

export const ADHDWrapper: React.FC<ADHDWrapperProps> = ({ children }) => {
  const { isADHDMode } = useAccessibilityStore();
  const [scrollProgress, setScrollProgress] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      const totalHeight = document.documentElement.scrollHeight - window.innerHeight;
      const progress = (window.scrollY / totalHeight) * 100;
      setScrollProgress(progress);
    };

    if (isADHDMode) {
      window.addEventListener('scroll', handleScroll);
    }
    return () => window.removeEventListener('scroll', handleScroll);
  }, [isADHDMode]);

  return (
    <MotionConfig transition={isADHDMode ? { duration: 0 } : undefined}>
      <div className={isADHDMode ? "adhd-mode-active" : ""}>
        {isADHDMode && (
          <div className="fixed top-0 left-0 right-0 z-[200] h-1 bg-background border-b">
            <Progress value={scrollProgress} className="h-full rounded-none bg-transparent" />
          </div>
        )}
        
        {isADHDMode && (
          <style dangerouslySetInnerHTML={{ __html: `
            .adhd-mode-active * {
              transition: none !important;
              animation: none !important;
            }
            /* Zen Mode: Hide Sidebar and Navbar if needed */
            /* We'll handle the sidebar in the StudyPage component using the isADHDMode state */
          `}} />
        )}

        {children}
      </div>
    </MotionConfig>
  );
};
