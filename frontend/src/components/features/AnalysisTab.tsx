import React from 'react';
import { motion } from 'motion/react';
import { useAccessibilityStore } from '@/store/accessibility';
import { TopicAnalysis } from '@/types';
import { fadeIn, staggerContainer, slideUp } from '@/lib/animations';

interface AnalysisTabProps {
  data: TopicAnalysis;
}

export const AnalysisTab = ({ data }: AnalysisTabProps) => {
  const { isADHDMode } = useAccessibilityStore();

  if (!data) return null;

  const getYearsCount = (years: string[] | number[] | string | undefined | null) => {
    if (!years) return 0;
    if (Array.isArray(years)) return years.length;
    if (typeof years === 'string') {
      if (years.includes(',')) return years.split(',').length;
      if (!isNaN(Number(years))) return years;
      return 1;
    }
    return 0;
  };

  const formatYearsList = (years: string[] | number[] | string | undefined | null) => {
    if (!years) return 'N/A';
    if (Array.isArray(years)) return years.join(', ');
    return years;
  };

  const hasQuestions = data.mostAskedQuestions && data.mostAskedQuestions.length > 0;

  const topStats = [
    { label: "Questions found", value: hasQuestions ? (data.totalQuestions || data.mostAskedQuestions.length) : 0 },
    { label: "Years appeared", value: hasQuestions ? getYearsCount(data.yearsAppeared) : 0 },
    { label: "Average Marks", value: hasQuestions ? (data.avgMarks || "N/A") : "N/A" },
  ];

  return (
    <motion.div 
      variants={fadeIn}
      initial="initial"
      animate="animate"
      className="max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8 space-y-16"
    >
      <motion.div 
        variants={staggerContainer}
        initial="initial"
        animate="animate"
        className="grid grid-cols-1 md:grid-cols-3 gap-8"
      >
        {topStats.map((stat) => (
          <motion.div
            key={stat.label}
            variants={slideUp}
            className="flex flex-col border-l border-border pl-4"
          >
            <h4 className="text-4xl font-light tracking-tight text-foreground">{stat.value}</h4>
            <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider mt-2">{stat.label}</p>
          </motion.div>
        ))}
      </motion.div>

      {data.mostAskedQuestions && data.mostAskedQuestions.length > 0 ? (
        <div className="space-y-8">
          <div className="border-b border-border pb-4">
            <h3 className="text-2xl font-semibold text-foreground tracking-tight"> Most Asked PYQs </h3>
            <p className="text-sm text-muted-foreground mt-2"> Frequency analysis over the provided context. </p>
          </div>
          
          <div className="space-y-10">
            {data.mostAskedQuestions.map((q, idx) => (
              <motion.div
                key={`${q.id}-${idx}`}
                variants={fadeIn}
                className="space-y-3"
              >
                <div className="flex justify-between items-start gap-6">
                  <h5 className="font-medium text-lg leading-relaxed text-foreground">
                    {q.question}
                  </h5>
                  <span className="text-sm font-mono text-muted-foreground whitespace-nowrap pt-1">
                    {q.marks} Marks
                  </span>
                </div>
                
                <p className="text-sm text-muted-foreground uppercase tracking-wider font-semibold">
                  Appeared: {formatYearsList(q.years)}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      ) : (
        <div className="flex h-full items-center justify-center py-20 px-4">
          <div className="space-y-2 text-center">
            <h3 className="text-2xl font-light text-foreground tracking-tight">No Previous Year Questions Present</h3>
            <p className="text-muted-foreground uppercase text-xs tracking-widest font-semibold mt-4">
               We could not find any PYQs for this specific topic in the provided documents.
            </p>
          </div>
        </div>
      )}
    </motion.div>
  );
};


