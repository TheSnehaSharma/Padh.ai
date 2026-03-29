import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ArrowRight, Clock, FileText, BrainCircuit } from 'lucide-react';
import { motion } from 'motion/react';
import { fadeIn, slideUp, staggerContainer, scaleIn } from '@/lib/animations';

export const LandingPage = () => {
  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] text-center space-y-8 px-6 sm:px-8">
      <motion.div
        variants={fadeIn}
        initial="initial"
        animate="animate"
        className="space-y-4 max-w-3xl"
      >
        <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight lg:text-7xl text-foreground">
          The One-Night Fight <br className="hidden sm:inline" />
          <span className="text-primary">Ends Here.</span>
        </h1>
        <p className="text-xl text-muted-foreground max-w-[600px] mx-auto">
          Turn your syllabus and PYQs into a 90-second exam strategy. 
          Built for engineering students who need to pass, fast.
        </p>
      </motion.div>

      <motion.div
        variants={scaleIn}
        initial="initial"
        animate="animate"
        className="flex flex-col sm:flex-row gap-4"
      >
        <Button size="lg" className="text-lg px-8 h-14" asChild>
          <Link to="/dashboard">
            Start 90-Second Exam Prep
            <ArrowRight className="ml-2 h-5 w-5" />
          </Link>
        </Button>
      </motion.div>

      <motion.div
        variants={staggerContainer}
        initial="initial"
        animate="animate"
        className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-16 text-left max-w-5xl w-full"
      >
        <motion.div variants={slideUp}>
          <Card className="p-6 bg-glass backdrop-blur-xl border-glass-border shadow-sm shadow-glass-shadow">
            <Clock className="h-10 w-10 text-primary mb-4" />
            <h3 className="text-xl font-bold mb-2">Instant Analysis</h3>
            <p className="text-muted-foreground">Upload your docs and get a structured study plan in under 90 seconds.</p>
          </Card>
        </motion.div>
        <motion.div variants={slideUp}>
          <Card className="p-6 bg-glass backdrop-blur-xl border-glass-border shadow-sm shadow-glass-shadow">
            <BrainCircuit className="h-10 w-10 text-primary mb-4" />
            <h3 className="text-xl font-bold mb-2">Adaptive Learning</h3>
            <p className="text-muted-foreground">ADHD and Dyslexia modes ensure you can focus on what matters most.</p>
          </Card>
        </motion.div>
        <motion.div variants={slideUp}>
          <Card className="p-6 bg-glass backdrop-blur-xl border-glass-border shadow-sm shadow-glass-shadow">
            <FileText className="h-10 w-10 text-primary mb-4" />
            <h3 className="text-xl font-bold mb-2">Smart Summaries</h3>
            <p className="text-muted-foreground">We chunk 10-mark answers and derivations into easy-to-digest cards.</p>
          </Card>
        </motion.div>
      </motion.div>
    </div>
  );
};

