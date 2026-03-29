import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Eye, Brain, Moon, Sun } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { useAccessibilityStore } from '@/store/accessibility';
import { cn } from '@/lib/utils';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
  const { 
    isADHDMode, toggleADHDMode,
    isDyslexiaMode, toggleDyslexiaMode,
    isDarkMode, toggleDarkMode
  } = useAccessibilityStore();

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="fixed left-[50%] top-[50%] z-50 grid w-full max-w-lg translate-x-[-50%] translate-y-[-50%] gap-4 border border-glass-border bg-glass backdrop-blur-xl p-6 shadow-2xl duration-200 sm:rounded-2xl md:w-full"
          >
            <div className="flex flex-col space-y-1.5 text-center sm:text-left">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold leading-none tracking-tight">Accessibility & Settings</h2>
                <Button variant="ghost" size="icon" onClick={onClose}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
              <p className="text-sm text-muted-foreground">
                Customize your learning experience.
              </p>
            </div>

            <div className="grid gap-4 py-4">
              <div className="flex items-center justify-between space-x-4 rounded-xl border border-glass-border bg-background/40 p-4">
                <div className="flex items-center space-x-4">
                  <Brain className="h-5 w-5 text-primary" />
                  <div className="flex-1 space-y-1">
                    <Label htmlFor="adhd-mode" className="text-sm font-medium leading-none">
                      ADHD Mode
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      Reduces animations and distractions.
                    </p>
                  </div>
                </div>
                <Switch
                  id="adhd-mode"
                  checked={isADHDMode}
                  onCheckedChange={toggleADHDMode}
                />
              </div>

              <div className="flex items-center justify-between space-x-4 rounded-xl border border-glass-border bg-background/40 p-4">
                <div className="flex items-center space-x-4">
                  <Eye className="h-5 w-5 text-primary" />
                  <div className="flex-1 space-y-1">
                    <Label htmlFor="dyslexia-mode" className="text-sm font-medium leading-none">
                      Dyslexia Mode
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      Uses OpenDyslexic font and high contrast.
                    </p>
                  </div>
                </div>
                <Switch
                  id="dyslexia-mode"
                  checked={isDyslexiaMode}
                  onCheckedChange={toggleDyslexiaMode}
                />
              </div>

              <div className="flex items-center justify-between space-x-4 rounded-xl border border-glass-border bg-background/40 p-4">
                <div className="flex items-center space-x-4">
                  {isDarkMode ? <Moon className="h-5 w-5 text-primary" /> : <Sun className="h-5 w-5 text-primary" />}
                  <div className="flex-1 space-y-1">
                    <Label htmlFor="dark-mode" className="text-sm font-medium leading-none">
                      Dark Mode
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      Toggle between light and dark themes.
                    </p>
                  </div>
                </div>
                <Switch
                  id="dark-mode"
                  checked={isDarkMode}
                  onCheckedChange={toggleDarkMode}
                />
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

