import React from 'react';
import { motion } from 'motion/react';
import ReactMarkdown from 'react-markdown';
import { NotesData } from '@/types';
import { fadeIn } from '@/lib/animations';

interface NotesTabProps {
  data: NotesData;
}

export const NotesTab = ({ data }: NotesTabProps) => {
  return (
    <motion.div
      variants={fadeIn}
      initial="initial"
      animate="animate"
      className="max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8 space-y-8"
    >
      <div className="prose prose-neutral md:prose-lg dark:prose-invert max-w-none prose-p:text-foreground prose-headings:text-foreground prose-strong:text-foreground prose-li:text-foreground prose-ul:text-foreground">
        <ReactMarkdown>{data.content}</ReactMarkdown>
      </div>
    </motion.div>
  );
};
