import React from 'react';
import { cn } from '@/lib/utils';

interface BionicTextProps {
  text: string;
  className?: string;
}

export const BionicText: React.FC<BionicTextProps> = ({ text, className }) => {
  // Split by words but keep separators (whitespace, newlines)
  const parts = text.split(/(\s+)/);

  return (
    <span className={cn("inline", className)}>
      {parts.map((part, index) => {
        // If it's whitespace, just return it
        if (/^\s+$/.test(part)) {
          return <span key={index} className="whitespace-pre-wrap">{part}</span>;
        }

        if (part.length <= 1) return <span key={index}>{part}</span>;
        
        // Wrap first 30-50% of the word in <b> tags
        const midpoint = Math.ceil(part.length * 0.4);
        const boldPart = part.substring(0, midpoint);
        const restPart = part.substring(midpoint);

        return (
          <span key={index} className="inline-block">
            <b className="font-bold">{boldPart}</b>
            {restPart}
          </span>
        );
      })}
    </span>
  );
};
