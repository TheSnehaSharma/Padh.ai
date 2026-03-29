import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { TrendingUp, BookOpen, Clock, CheckCircle2, ArrowRight, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useAccessibilityStore } from '@/store/accessibility';
import { TopicAnalysis } from '@/types';
import { fadeIn, slideUp, staggerContainer } from '@/lib/animations';
import { ReadAloudButton } from '@/components/a11y/DyslexiaWrapper';

interface AnalysisTabProps {
  data: TopicAnalysis;
}

export const AnalysisTab = ({ data }: AnalysisTabProps) => {
  const { isADHDMode } = useAccessibilityStore();

  const getYearsCount = (years: string[] | number[] | string) => {
    if (Array.isArray(years)) return years.length;
    if (typeof years === 'string') {
      // Check if it's a comma separated list
      if (years.includes(',')) return years.split(',').length;
      // Check if it's just a number
      if (!isNaN(Number(years))) return years;
      return 1;
    }
    return 0;
  };

  const formatYearsList = (years: string[] | number[] | string) => {
    if (Array.isArray(years)) return years.join(', ');
    return years;
  };

  const topStats = [
    { label: "Questions", value: data.totalQuestions, icon: BookOpen, color: "text-blue-500", bg: "bg-blue-500/10" },
    { label: "Years", value: getYearsCount(data.yearsAppeared), icon: Clock, color: "text-amber-500", bg: "bg-amber-500/10" },
    { label: "Avg. Marks", value: data.avgMarks, icon: CheckCircle2, color: "text-purple-500", bg: "bg-purple-500/10" },
  ];

  return (
    <div className="space-y-8 p-1">
      {/* Top Row: Stats Grid */}
      <motion.div 
        variants={staggerContainer}
        initial="initial"
        animate="animate"
        className="grid grid-cols-1 md:grid-cols-3 gap-6"
      >
        {topStats.map((stat) => (
          <motion.div
            key={stat.label}
            variants={slideUp}
            className="flex-1"
          >
            <Card className="h-full border-glass-border bg-glass backdrop-blur-xl shadow-sm shadow-glass-shadow hover:shadow-md transition-all duration-300 flex items-center p-6 text-left">
              <div className={cn("p-3 rounded-xl mr-4 shrink-0", stat.bg)}>
                <stat.icon className={cn("h-6 w-6", stat.color)} />
              </div>
              <div className="flex flex-col">
                <h4 className="text-2xl font-bold tracking-tight text-foreground">{stat.value}</h4>
                <p className="text-sm font-medium text-muted-foreground">{stat.label}</p>
              </div>
            </Card>
          </motion.div>
        ))}
      </motion.div>

      {/* Third Row: Most Asked PYQs - Plain Text on White Background */}
      <div className="bg-background rounded-3xl border border-glass-border shadow-xl overflow-hidden">
        <div className="p-6 border-b border-glass-border bg-primary/5">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-primary" />
                Most Asked PYQs
              </h3>
              <p className="text-sm text-muted-foreground mt-1">
                Based on frequency analysis of the last 10 years.
              </p>
            </div>
          </div>
        </div>
        
        <div className="divide-y divide-glass-border">
          {data.mostAskedQuestions.map((q, idx) => (
            <motion.div
              key={`${q.id}-${idx}`}
              variants={fadeIn}
              initial="initial"
              animate="animate"
              className="p-6 hover:bg-muted/30 transition-colors group cursor-pointer"
            >
              <div className="flex flex-col gap-4">
                <div className="flex items-start justify-between gap-6">
                  <div className="flex items-center gap-2">
                    <h5 className="font-medium text-base leading-relaxed text-foreground group-hover:text-primary transition-colors">
                      {q.question}
                    </h5>
                    <ReadAloudButton text={q.question} />
                  </div>
                  <div className="flex flex-col items-end gap-1.5 shrink-0">
                    <Badge variant={q.marks === 10 ? "default" : "secondary"} className="text-xs h-6 px-2.5">
                      {q.marks} Marks
                    </Badge>
                  </div>
                </div>
                
                <div className="flex items-center justify-between mt-2">
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-muted-foreground flex items-center gap-1.5 font-medium">
                      <Clock className="h-3.5 w-3.5" />
                      {formatYearsList(q.years)}
                    </span>
                  </div>
                  <Button variant="ghost" size="sm" className="h-8 text-xs font-medium opacity-0 group-hover:opacity-100 transition-opacity text-primary hover:text-primary hover:bg-primary/10">
                    View Detailed Answer <ArrowRight className="ml-1.5 h-4 w-4" />
                  </Button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
};


