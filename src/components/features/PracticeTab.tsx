import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronDown, ChevronUp, Brain, Lightbulb, Loader2 } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useAccessibilityStore } from '@/store/accessibility';
import { PracticeQuestion } from '@/types';
import { fadeIn, slideUp, staggerContainer } from '@/lib/animations';
import { BionicText } from '@/lib/bionic-text';

interface PracticeTabProps {
  data: PracticeQuestion[];
}

export const PracticeTab = ({ data }: PracticeTabProps) => {
  const [openQuestionId, setOpenQuestionId] = useState<string | null>(null);
  const { isADHDMode } = useAccessibilityStore();

  const toggleQuestion = (id: string) => {
    setOpenQuestionId(openQuestionId === id ? null : id);
  };

  const categories: ('Short' | 'Medium' | 'Long')[] = ['Short', 'Medium', 'Long'];

  return (
    <div className="space-y-6 p-1">
      {categories.map((category) => {
        const categoryQuestions = data.filter(q => q.category === category);
        if (categoryQuestions.length === 0) return null;

        return (
          <div key={category} className="space-y-4">
            <h3 className="text-lg font-semibold flex items-center gap-2 text-foreground tracking-tight pl-2">
              <span className={cn(
                "h-2.5 w-2.5 rounded-full",
                category === 'Short' ? "bg-emerald-500" :
                category === 'Medium' ? "bg-amber-500" : "bg-rose-500"
              )} />
              {category} Answer Questions
            </h3>
            
            <motion.div 
              variants={staggerContainer}
              initial="initial"
              animate="animate"
              className="space-y-3"
            >
              {categoryQuestions.map((q) => (
                <motion.div key={q.id} variants={slideUp}>
                  <Card 
                    className={cn(
                      "overflow-hidden border-glass-border bg-glass backdrop-blur-xl shadow-sm shadow-glass-shadow transition-all duration-300",
                      openQuestionId === q.id ? "ring-1 ring-primary/50 shadow-lg bg-background" : "hover:bg-background/90"
                    )}
                  >
                    <button
                      onClick={() => toggleQuestion(q.id)}
                      className="w-full flex items-start justify-between p-5 text-left focus:outline-none group"
                    >
                      <div className="space-y-3 flex-1 pr-4">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-[10px] h-5 px-1.5 border-primary/20 text-primary bg-primary/5 font-mono">
                            {q.marks} Marks
                          </Badge>
                          {category === 'Long' && (
                            <Badge variant="secondary" className="text-[10px] h-5 px-1.5 bg-amber-500/10 text-amber-600 border-amber-200 font-mono">
                              High Yield
                            </Badge>
                          )}
                        </div>
                        <p className="font-medium text-base leading-relaxed text-foreground group-hover:text-primary transition-colors">
                          {isADHDMode ? <BionicText text={q.question} /> : q.question}
                        </p>
                      </div>
                      {openQuestionId === q.id ? (
                        <ChevronUp className="h-5 w-5 text-muted-foreground shrink-0 mt-1" />
                      ) : (
                        <ChevronDown className="h-5 w-5 text-muted-foreground shrink-0 mt-1 group-hover:text-primary transition-colors" />
                      )}
                    </button>

                    <AnimatePresence>
                      {openQuestionId === q.id && (
                        <motion.div
                          variants={fadeIn}
                          initial="initial"
                          animate="animate"
                          exit="exit"
                          transition={{ duration: 0.2 }}
                        >
                          <div className="px-5 pb-5 pt-0">
                            <div className="pt-4 border-t border-glass-border space-y-3">
                              <div className="flex items-center gap-2 text-sm font-semibold text-primary mb-2">
                                <Lightbulb className="h-4 w-4" />
                                Answer Logic
                              </div>
                              <div className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line bg-muted/30 p-4 rounded-xl border border-glass-border font-mono">
                                {isADHDMode ? <BionicText text={q.answer} /> : q.answer}
                              </div>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </Card>
                </motion.div>
              ))}
            </motion.div>
          </div>
        );
      })}
    </div>
  );
};

