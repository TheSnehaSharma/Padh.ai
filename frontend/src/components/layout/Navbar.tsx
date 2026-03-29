import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Settings, BookOpen, Menu, X, MessageSquare, LayoutDashboard, GraduationCap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SettingsModal } from '@/components/features/SettingsModal';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'motion/react';

import { useAccessibilityStore } from '@/store/accessibility';

export const Navbar = () => {
  const { isADHDMode } = useAccessibilityStore();
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const location = useLocation();

  const navLinks = [
    { to: '/dashboard', label: 'Upload', icon: LayoutDashboard },
    { to: '/study', label: 'Study', icon: GraduationCap },
    { to: '/chat', label: 'Assistant', icon: MessageSquare },
  ];

  const isStudyOrChat = location.pathname === '/study' || location.pathname === '/chat';

  return (
    <>
      <header className="sticky top-0 z-50 w-full border-b border-glass-border bg-glass backdrop-blur-xl supports-[backdrop-filter]:bg-glass">
        <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex h-14 items-center justify-between">
          <div className="flex items-center gap-2">
            {!isADHDMode && (
              <>
                <Link to="/" className="flex items-center gap-2 font-bold text-xl tracking-tight group">
                  <div className="p-1.5 bg-primary/10 rounded-lg group-hover:scale-110 transition-transform duration-300">
                    <BookOpen className="h-5 w-5 text-primary" />
                  </div>
                  <span className="text-foreground">
                    Padh<span className="bg-clip-text text-transparent bg-gradient-to-r from-indigo-500 to-teal-400 font-bold">.ai</span>
                  </span>
                </Link>
                
                {/* Desktop Nav */}
                <nav className="hidden md:flex items-center gap-1 ml-8">
                  {navLinks.map((link) => (
                    <Link 
                      key={link.to}
                      to={link.to} 
                      className={cn(
                        "px-3 py-1.5 text-sm font-medium rounded-md transition-colors flex items-center gap-2",
                        location.pathname === link.to 
                          ? "bg-primary/10 text-primary" 
                          : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                      )}
                    >
                      <link.icon className="h-4 w-4" />
                      {link.label}
                    </Link>
                  ))}
                </nav>
              </>
            )}
            {isADHDMode && isStudyOrChat && (
              <div className="flex items-center gap-2 text-muted-foreground text-sm font-medium">
                <BookOpen className="h-4 w-4" />
                <span>Focus Mode Active</span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => setIsSettingsOpen(true)}
              className="text-muted-foreground hover:text-foreground"
            >
              <Settings className="h-5 w-5" />
            </Button>
            
            {/* Mobile Menu Toggle */}
            {!isADHDMode && (
              <Button 
                variant="ghost" 
                size="icon" 
                className="md:hidden text-muted-foreground hover:text-foreground"
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              >
                {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </Button>
            )}
          </div>
        </div>

        {/* Mobile Nav Menu */}
        {!isADHDMode && (
          <AnimatePresence>
            {isMobileMenuOpen && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="md:hidden border-b border-glass-border bg-glass backdrop-blur-xl overflow-hidden"
              >
                <nav className="flex flex-col p-4 gap-2">
                  {navLinks.map((link) => (
                    <Link 
                      key={link.to}
                      to={link.to} 
                      onClick={() => setIsMobileMenuOpen(false)}
                      className={cn(
                        "px-4 py-3 text-base font-medium rounded-xl transition-colors flex items-center gap-3",
                        location.pathname === link.to 
                          ? "bg-primary/10 text-primary" 
                          : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                      )}
                    >
                      <link.icon className="h-5 w-5" />
                      {link.label}
                    </Link>
                  ))}
                </nav>
              </motion.div>
            )}
          </AnimatePresence>
        )}
      </header>

      <SettingsModal 
        isOpen={isSettingsOpen} 
        onClose={() => setIsSettingsOpen(false)} 
      />
    </>
  );
};

