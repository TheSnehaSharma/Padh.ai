import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Eye, EyeOff } from 'lucide-react';
import { cn } from '@/lib/utils';

interface QuestionCardProps {
  data: {
    id: number | string;
    question?: string;
    title?: string;
    problem?: string;
    answer?: string;
    content?: string;
    steps?: string[];
    solution?: string;
  };
  type: '2marks' | '5marks' | '10marks' | 'numericals';
}

export const QuestionCard: React.FC<QuestionCardProps> = ({ data, type }) => {
  const [showAnswer, setShowAnswer] = useState(false);

  const title = data.question || data.title || data.problem;

  return (
    <Card className={cn(
      type === '10marks' && "border-l-4 border-l-primary"
    )}>
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <CardTitle className={cn("text-lg leading-snug", type === '10marks' && "text-xl")}>
          {title}
        </CardTitle>
        
        <AnimatePresence mode="wait">
          {!showAnswer && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="shrink-0"
            >
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setShowAnswer(true)}
                className="h-7 px-3 text-xs gap-1.5 bg-transparent border-primary/20 text-primary hover:bg-primary/10 hover:text-primary transition-colors"
              >
                <Eye className="h-3.5 w-3.5" />
                Show Answer
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </CardHeader>
      <CardContent>
        <AnimatePresence>
          {showAnswer && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="space-y-4 overflow-hidden"
            >
              <div className="pt-2 border-t border-dashed border-primary/20">
                {data.answer && <p className="text-muted-foreground leading-relaxed">{data.answer}</p>}
                
                {data.content && <p className="leading-relaxed text-muted-foreground">{data.content}</p>}
                
                {data.steps && (
                  <div className="space-y-4 mt-4">
                    {data.steps.map((step, idx) => (
                      <div key={idx} className="p-4 bg-primary/5 rounded-lg border border-primary/10">
                        <h4 className="font-semibold mb-1 text-primary">Step {idx + 1}</h4>
                        <p className="text-sm">{step}</p>
                      </div>
                    ))}
                  </div>
                )}
                
                {data.solution && (
                  <div className="bg-black/5 dark:bg-white/5 p-4 rounded-md font-mono text-sm border border-primary/10 mt-4">
                    {data.solution}
                  </div>
                )}

                <div className="pt-4 flex justify-end">
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => setShowAnswer(false)}
                    className="gap-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                  >
                    <EyeOff className="h-4 w-4" />
                    Hide Answer
                  </Button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </CardContent>
    </Card>
  );
};
