import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronDown, ChevronUp, AlertCircle, BarChart3, TrendingUp, BookOpen } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { cn } from '@/lib/utils';

// Mock Data
const topicFrequency = [
  { topic: 'Thermodynamics Laws', count: 9, total: 10, probability: 90 },
  { topic: 'Carnot Cycle', count: 8, total: 10, probability: 80 },
  { topic: 'Entropy & Enthalpy', count: 6, total: 10, probability: 60 },
  { topic: 'Rankine Cycle', count: 5, total: 10, probability: 50 },
  { topic: 'Heat Transfer', count: 3, total: 10, probability: 30 },
];

const questions = [
  {
    id: 'q1',
    topic: 'Thermodynamics Laws',
    question: 'State and explain the First Law of Thermodynamics. Derive the expression for work done in an adiabatic process.',
    badges: ['10-Mark', 'Repeated 5x', 'Derivation'],
    year: '2023, 2021, 2019, 2018, 2015'
  },
  {
    id: 'q2',
    topic: 'Carnot Cycle',
    question: 'Describe the Carnot cycle with a P-V diagram. Derive an expression for its efficiency.',
    badges: ['10-Mark', 'Repeated 4x', 'Derivation', 'Diagram'],
    year: '2022, 2020, 2017, 2016'
  },
  {
    id: 'q3',
    topic: 'Entropy',
    question: 'What is Entropy? Explain the principle of increase of entropy.',
    badges: ['5-Mark', 'Repeated 3x', 'Theory'],
    year: '2023, 2019, 2015'
  },
  {
    id: 'q4',
    topic: 'Rankine Cycle',
    question: 'Explain the working of a Rankine Cycle with a schematic diagram.',
    badges: ['10-Mark', 'Repeated 2x', 'Diagram'],
    year: '2021, 2018'
  },
];

export const FrequencyAnalysis = () => {
  const [openQuestionId, setOpenQuestionId] = useState<string | null>(null);

  const toggleQuestion = (id: string) => {
    setOpenQuestionId(openQuestionId === id ? null : id);
  };

  return (
    <div className="space-y-8">
      {/* Frequency Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-primary" />
            Topic Frequency Analysis
          </CardTitle>
          <CardDescription>
            Based on the last 10 years of question papers.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {topicFrequency.map((item, index) => (
            <div key={index} className="space-y-2">
              <div className="flex justify-between text-sm font-medium">
                <span>{item.topic}</span>
                <span className="text-muted-foreground">
                  {item.count}/{item.total} Years ({item.probability}%)
                </span>
              </div>
              <div className="h-2 w-full bg-secondary rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-primary"
                  initial={{ width: 0 }}
                  animate={{ width: `${item.probability}%` }}
                  transition={{ duration: 1, ease: "easeOut", delay: index * 0.1 }}
                />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Most Asked Questions */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            Most Asked Questions
          </h3>
          <Badge variant="outline" className="text-xs font-normal">
            Sorted by Frequency
          </Badge>
        </div>

        <div className="space-y-3">
          {questions.map((q) => (
            <Card 
              key={q.id} 
              className="overflow-hidden"
            >
              <button
                onClick={() => toggleQuestion(q.id)}
                className="w-full flex items-center justify-between p-4 text-left focus:outline-none"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm text-muted-foreground uppercase tracking-wider">
                      {q.topic}
                    </span>
                    {q.badges.includes('10-Mark') && (
                      <Badge variant="secondary" className="text-[10px] h-5 px-1.5">High Value</Badge>
                    )}
                  </div>
                  <p className="font-medium line-clamp-1 pr-4">{q.question}</p>
                </div>
                {openQuestionId === q.id ? (
                  <ChevronUp className="h-5 w-5 text-muted-foreground shrink-0" />
                ) : (
                  <ChevronDown className="h-5 w-5 text-muted-foreground shrink-0" />
                )}
              </button>

              <AnimatePresence>
                {openQuestionId === q.id && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <div className="px-4 pb-4 pt-0 border-t bg-muted/30">
                      <div className="pt-4 space-y-3">
                        <p className="text-sm text-foreground leading-relaxed">
                          {q.question}
                        </p>
                        
                        <div className="flex flex-wrap gap-2 mt-3">
                          {q.badges.map((badge, idx) => (
                            <Badge key={idx} variant="outline" className="bg-background">
                              {badge}
                            </Badge>
                          ))}
                        </div>

                        <div className="flex items-center gap-2 text-xs text-muted-foreground mt-2 pt-2 border-t border-border/50">
                          <AlertCircle className="h-3 w-3" />
                          <span>Appeared in: {q.year}</span>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
};
