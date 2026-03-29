import React, { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Terminal as TerminalIcon, Loader2, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TerminalProps {
  thoughts: { message: string; timestamp: number }[];
  isComplete: boolean;
}

export const Terminal = ({ thoughts, isComplete }: TerminalProps) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [thoughts]);

  return (
    <div className="w-full max-w-2xl mx-auto font-mono text-sm bg-black/90 text-green-400 rounded-xl overflow-hidden border border-green-500/30 shadow-2xl shadow-green-500/10">
      <div className="flex items-center justify-between px-4 py-2 bg-green-900/20 border-b border-green-500/20">
        <div className="flex items-center gap-2">
          <TerminalIcon className="w-4 h-4" />
          <span className="text-xs font-semibold tracking-wider uppercase">Agent Stream</span>
        </div>
        <div className="flex gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-red-500/50" />
          <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/50" />
          <div className="w-2.5 h-2.5 rounded-full bg-green-500/50" />
        </div>
      </div>
      
      <div 
        ref={scrollRef}
        className="p-4 h-64 overflow-y-auto space-y-2 scroll-smooth custom-scrollbar"
      >
        <AnimatePresence initial={false}>
          {thoughts.map((thought, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.2 }}
              className="flex items-start gap-3"
            >
              <span className="text-green-600 shrink-0 select-none">{'>'}</span>
              <span className={cn(
                "break-words leading-relaxed",
                i === thoughts.length - 1 && !isComplete ? "animate-pulse" : ""
              )}>
                {thought.message}
              </span>
              {i < thoughts.length - 1 && (
                <CheckCircle2 className="w-3.5 h-3.5 text-green-600/50 ml-auto shrink-0 mt-0.5" />
              )}
            </motion.div>
          ))}
        </AnimatePresence>
        
        {!isComplete && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex items-center gap-2 text-green-600/70 pt-2"
          >
            <Loader2 className="w-3 h-3 animate-spin" />
            <span className="text-xs">Processing...</span>
          </motion.div>
        )}
        
        {isComplete && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-green-300 pt-4 border-t border-green-500/20 mt-4"
          >
            <span className="mr-2">✓</span>
            Generation complete. Loading interface...
          </motion.div>
        )}
      </div>
    </div>
  );
};
