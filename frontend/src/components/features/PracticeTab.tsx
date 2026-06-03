import React from 'react';
import { motion } from 'motion/react';
import { useAccessibilityStore } from '@/store/accessibility';
import { useStudyStore } from '@/store/study';
import { PracticeQuestion } from '@/types';
import { fadeIn } from '@/lib/animations';
import { BionicText } from '@/lib/bionic-text';
import { cn } from '@/lib/utils';

interface PracticeTabProps {
  data: PracticeQuestion[];
  topicName?: string;
}

export const PracticeTab = ({ data, topicName }: PracticeTabProps) => {
  const { isADHDMode } = useAccessibilityStore();
  const { solvedQuestions, toggleQuestionSolved } = useStudyStore();
  const categories: ('Short' | 'Medium' | 'Long')[] = ['Short', 'Medium', 'Long'];

  if (!data || data.length === 0) {
    return (
      <div className="flex h-full items-center justify-center py-20 px-4">
        <div className="space-y-2 text-center">
          <h3 className="text-2xl font-light text-foreground tracking-tight">No Practice Questions Present</h3>
          <p className="text-muted-foreground uppercase text-xs tracking-widest font-semibold mt-4">
             Previous Year Questions or context could not be extracted for this topic.
          </p>
        </div>
      </div>
    );
  }

  // Use the topicName for store lookup, fallback to safe ID
  const storeTopicKey = topicName || 'unknown-topic';
  const solvedSet = new Set(solvedQuestions[storeTopicKey] || []);

  const pyqQuestions = data.filter(q => q.source === "PYQ" || (q.question && q.question.includes("[Source: PYQ]")));
  const notesQuestions = data.filter(q => q.source !== "PYQ" && !(q.question && q.question.includes("[Source: PYQ]")));

  const Section = ({ title, questions }: { title: string, questions: PracticeQuestion[] }) => {
    if (questions.length === 0) return null;
    return (
      <div className="space-y-10">
        <h2 className="text-3xl font-semibold text-foreground tracking-tight border-b border-border pb-3">
          {title}
        </h2>
        {categories.map((category) => {
          const categoryQuestions = questions.filter(q => q.category === category);
          if (categoryQuestions.length === 0) return null;

          return (
            <div key={category} className="space-y-8 pl-2">
              <h3 className="text-xl font-medium text-foreground tracking-tight border-b border-border/50 pb-2">
                {category} Answer Questions
              </h3>
              
              <div className="space-y-10">
                {categoryQuestions.map((q, index) => {
                  const isSolved = solvedSet.has(q.id.toString());
                  return (
                    <div key={q.id} className="space-y-4">
                      <div className="flex gap-4 items-start group">
                        <div className="pt-1.5 flex items-center justify-center shrink-0 w-6">
                          <input 
                            type="checkbox"
                            id={`q-${q.id}`} 
                            checked={isSolved}
                            onChange={() => toggleQuestionSolved(storeTopicKey, q.id.toString())}
                            className="h-5 w-5 rounded border-muted-foreground/30 accent-primary cursor-pointer transition-all opacity-70 group-hover:opacity-100"
                          />
                        </div>
                        <label 
                          htmlFor={`q-${q.id}`}
                          className={cn("font-medium text-lg leading-relaxed cursor-pointer transition-colors flex-1", isSolved ? "text-muted-foreground line-through opacity-70" : "text-foreground")}
                        >
                          <span className="font-semibold text-foreground mr-2 group-[.line-through]:text-muted-foreground">{index + 1}.</span>
                          {isADHDMode ? <BionicText text={q.question.replace(/\[Source:.*?\]/gi, '')} /> : q.question.replace(/\[Source:.*?\]/gi, '')}
                        </label>
                      </div>
                      
                      <div className={cn("pl-[3.25rem] space-y-2 transition-all", isSolved ? "opacity-50" : "")}>
                        <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Answer</p>
                        <div className="text-base text-foreground font-medium leading-relaxed whitespace-pre-line">
                          {isADHDMode ? <BionicText text={q.answer.replace(/\[Source:.*?\]/gi, '')} /> : q.answer.replace(/\[Source:.*?\]/gi, '')}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <motion.div 
      variants={fadeIn}
      initial="initial"
      animate="animate"
      className="max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8 space-y-16"
    >
      <Section title="Previous Year Questions (PYQs)" questions={pyqQuestions} />
      <Section title="Practice Questions (Book/Notes)" questions={notesQuestions} />
    </motion.div>
  );
};

