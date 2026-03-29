import React from 'react';
import { motion } from 'motion/react';
import { Search, X, Flame } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { Topic } from '@/types';
import { fadeIn, staggerContainer } from '@/lib/animations';

interface StudySidebarProps {
  isOpen: boolean;
  onClose: () => void;
  topics: Topic[];
  selectedTopicId: string | null;
  onSelectTopic: (id: string) => void;
}

export const StudySidebar = ({ 
  isOpen, 
  onClose, 
  topics, 
  selectedTopicId, 
  onSelectTopic 
}: StudySidebarProps) => {
  return (
    <motion.aside 
      initial={false}
      animate={{ 
        width: isOpen ? (typeof window !== 'undefined' && window.innerWidth < 768 ? '100%' : '280px') : '0px',
        opacity: isOpen ? 1 : 0
      }}
      className="border-r border-glass-border bg-glass backdrop-blur-xl flex flex-col overflow-hidden relative z-20"
    >
      <div className="p-4 border-b border-glass-border flex items-center justify-between gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Search topics..." 
            className="pl-9 bg-background/50 border-glass-border focus:bg-background transition-colors"
          />
        </div>
        <Button 
          variant="ghost" 
          size="icon" 
          className="md:hidden h-9 w-9 shrink-0"
          onClick={onClose}
        >
          <X className="h-5 w-5" />
        </Button>
      </div>
      
      <ScrollArea className="flex-1 py-2">
        <motion.div 
          variants={staggerContainer}
          initial="initial"
          animate="animate"
          className="px-2 space-y-1"
        >
          <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
            High Yield Topics
          </div>
          {topics.map((topic) => (
            <motion.button
              key={topic.id}
              variants={fadeIn}
              onClick={() => onSelectTopic(topic.id)}
              className={cn(
                "w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-all group relative overflow-hidden",
                selectedTopicId === topic.id 
                  ? "bg-primary/10 text-primary" 
                  : "text-muted-foreground hover:bg-primary/5 hover:text-foreground"
              )}
            >
              {selectedTopicId === topic.id && (
                <motion.div
                  layoutId="active-topic"
                  className="absolute left-0 top-0 bottom-0 w-1 bg-primary rounded-r-full"
                />
              )}
              <div className="flex flex-col items-start z-10 min-w-0">
                <span className="truncate w-full">{topic.name}</span>
                {topic.importance && (
                  <span className={cn(
                    "text-[10px] uppercase tracking-tighter font-bold",
                    topic.importance === 'High' ? "text-rose-500" : 
                    topic.importance === 'Medium' ? "text-orange-500" : "text-blue-500"
                  )}>
                    {topic.importance} Priority
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 z-10 shrink-0">
                {topic.frequency > 80 && (
                  <Flame className={cn("h-3.5 w-3.5", topic.color)} />
                )}
                <span className={cn(
                  "text-xs font-mono",
                  selectedTopicId === topic.id ? "text-primary/80" : "text-muted-foreground/50"
                )}>
                  {topic.frequency}%
                </span>
              </div>
            </motion.button>
          ))}
        </motion.div>
      </ScrollArea>
    </motion.aside>
  );
};
