import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  LayoutGrid, Headphones, BarChart3, PenTool, 
  ChevronRight, Menu, Loader2, BookOpen
} from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { NotesTab } from '@/components/features/NotesTab';
import { AudioTab } from '@/components/features/AudioTab';
import { AnalysisTab } from '@/components/features/AnalysisTab';
import { PracticeTab } from '@/components/features/PracticeTab';
import { useAccessibilityStore } from '@/store/accessibility';
import { useStudyStore } from '@/store/study';
import { cn } from '@/lib/utils';
import { fetchTopics } from '@/lib/api';
import { fadeIn } from '@/lib/animations';
import { usePassPackGenerator } from '@/hooks/usePassPackGenerator';
import { Terminal } from '@/components/ui/Terminal';
import { StudySidebar } from '@/components/layout/StudySidebar';

const TabSkeleton = React.memo(({ activeTab }: { activeTab: string }) => {
  if (activeTab === 'notes') {
    return (
      <div className="max-w-4xl mx-auto py-12 px-4 sm:px-6 lg:px-8 space-y-10 w-full animate-pulse">
        <Skeleton className="h-12 w-3/4 mb-10" />
        <div className="space-y-4">
          <Skeleton className="h-5 w-full" />
          <Skeleton className="h-5 w-full" />
          <Skeleton className="h-5 w-5/6" />
        </div>
        <div className="space-y-4 pt-10">
          <Skeleton className="h-8 w-1/3 mb-6" />
          <Skeleton className="h-5 w-full" />
          <Skeleton className="h-5 w-full" />
          <Skeleton className="h-5 w-4/5" />
        </div>
        <div className="space-y-4 pt-10">
          <Skeleton className="h-8 w-1/4 mb-6" />
          <Skeleton className="h-5 w-full" />
          <Skeleton className="h-5 w-3/4" />
        </div>
      </div>
    );
  }
  
  if (activeTab === 'analysis') {
    return (
      <div className="max-w-4xl mx-auto py-12 px-4 sm:px-6 lg:px-8 space-y-12 w-full animate-pulse">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Skeleton className="h-32 w-full rounded-2xl" />
          <Skeleton className="h-32 w-full rounded-2xl" />
          <Skeleton className="h-32 w-full rounded-2xl" />
        </div>
        <Skeleton className="h-80 w-full rounded-2xl" />
      </div>
    );
  }
  
  return (
    <div className="max-w-4xl mx-auto py-12 px-4 sm:px-6 lg:px-8 space-y-10 w-full animate-pulse">
       <Skeleton className="h-10 w-1/3 rounded-xl mb-8" />
       {[1, 2, 3].map(i => (
         <div key={i} className="space-y-4">
           <Skeleton className="h-6 w-full" />
           <Skeleton className="h-24 w-full" />
         </div>
       ))}
    </div>
  );
});

export const StudyPage = () => {
  const { 
    topics, selectedTopicId, passPack, activeTab, topicData,
    setTopics, setSelectedTopicId, setPassPack, setActiveTab, setTopicData
  } = useStudyStore();

  const { generate, thoughts, result, isGenerating, error } = usePassPackGenerator();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isLoading, setIsLoading] = useState(topics.length === 0);
  const { isADHDMode } = useAccessibilityStore();

  useEffect(() => {
    const loadTopics = async () => {
      if (topics.length > 0) {
        setIsLoading(false);
        return;
      }
      try {
        const data = await fetchTopics();
        setTopics(data);
        if (data.length > 0 && !selectedTopicId) setSelectedTopicId(data[0].id);
      } catch (error) {
        console.error("Failed to fetch topics:", error);
      } finally {
        setIsLoading(false);
      }
    };
    loadTopics();
  }, []);

  useEffect(() => {
    const pollInterval = setInterval(async () => {
      const hasProcessingTopic = topics.some(t => t.name.includes("Processing") || t.name.includes("Processing..."));
      if (hasProcessingTopic || topics.length === 0) {
        try {
          const data = await fetchTopics();
          if (JSON.stringify(data) !== JSON.stringify(topics)) {
            setTopics(data);
            if (data.length > 0 && !selectedTopicId) setSelectedTopicId(data[0].id);
          }
        } catch (error) {
          console.error("Failed to poll topics:", error);
        }
      }
    }, 3000);
    return () => clearInterval(pollInterval);
  }, [topics, setTopics, selectedTopicId, setSelectedTopicId]);

  useEffect(() => {
    if (result) {
      setPassPack(result);
      if (result.topic) {
        const topic = topics.find(t => t.name === result.topic);
        const topicId = topic?.id || selectedTopicId;
        if (topicId) setTopicData(topicId, result);
      }
      if (result.topics && result.topics.length > 0) {
        setTopics(result.topics);
      }
    }
  }, [result, setPassPack, setTopics, setTopicData, selectedTopicId, topics]);

  useEffect(() => {
    const loadPassPack = async () => {
      if (!selectedTopicId) return;
      const topic = topics.find(t => t.id === selectedTopicId);
      if (!topic) return;

      if (topicData[selectedTopicId]) {
        setPassPack(topicData[selectedTopicId]);
        return;
      }
      
      if (!isGenerating && !topic.name.includes("(Processing...)")) {
        generate(topic.name);
      }
    };
    loadPassPack();
  }, [selectedTopicId, topics, topicData, isGenerating, generate]);

  const selectedTopic = topics.find(t => t.id === selectedTopicId);

  const handleSelectTopic = React.useCallback((id: string) => {
    setSelectedTopicId(id);
    if (window.innerWidth < 768) setIsSidebarOpen(false);
  }, [setSelectedTopicId]);

  if (isLoading) {
    return (
      <div className="flex h-[calc(100vh-3.5rem)] overflow-hidden bg-background">
        {/* Sidebar Skeleton */}
        <div className="hidden md:flex w-72 h-full border-r border-border bg-muted/10 flex-col">
          <div className="p-4 border-b border-border space-y-4">
            <Skeleton className="h-10 w-full rounded-full" />
            <Skeleton className="h-6 w-3/4" />
          </div>
          <div className="p-4 space-y-3">
             <Skeleton className="h-10 w-full rounded-md" />
             <Skeleton className="h-10 w-full rounded-md" />
             <Skeleton className="h-10 w-full rounded-md" />
             <Skeleton className="h-10 w-full rounded-md" />
          </div>
        </div>

        {/* Main Content Skeleton */}
        <main className="flex-1 flex flex-col min-w-0 bg-background relative">
          <header className="px-6 py-8 border-b border-border flex flex-col sm:flex-row sm:items-end justify-between gap-6 bg-background/95">
             <div className="space-y-4 w-full max-w-lg">
                <Skeleton className="h-10 w-3/4" />
             </div>
             <div className="flex gap-4">
               <Skeleton className="h-8 w-16" />
               <Skeleton className="h-8 w-16" />
               <Skeleton className="h-8 w-16" />
               <Skeleton className="h-8 w-16" />
             </div>
          </header>
          <div className="flex-1 overflow-y-auto">
             <TabSkeleton activeTab="notes" />
          </div>
        </main>
      </div>
    );
  }

  if (topics.length === 0) {
    return (
      <div className="flex h-[calc(100vh-3.5rem)] items-center justify-center bg-background p-6">
        <motion.div 
          variants={fadeIn}
          initial="initial"
          animate="animate"
          className="text-center space-y-6 max-w-md"
        >
          <div className="space-y-4">
            <h2 className="text-3xl font-light tracking-tight">No content found</h2>
            <p className="text-muted-foreground text-lg">
              Begin by uploading your syllabus and previous year papers.
            </p>
          </div>
          <Button size="lg" className="rounded px-8" asChild>
            <a href="/dashboard">Return to Dashboard</a>
          </Button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-3.5rem)] overflow-hidden bg-background">
      {!isADHDMode && (
        <StudySidebar 
          isOpen={isSidebarOpen} 
          onClose={() => setIsSidebarOpen(false)} 
          topics={topics} 
          selectedTopicId={selectedTopicId} 
          onSelectTopic={handleSelectTopic} 
        />
      )}

      <main className={cn(
        "flex-1 flex flex-col min-w-0 bg-background relative overflow-y-auto custom-scrollbar",
        (isSidebarOpen && !isADHDMode) && "hidden md:flex",
        isADHDMode && "w-full max-w-4xl mx-auto"
      )}>
        <Tabs 
          defaultValue="notes" 
          value={activeTab === 'mindmap' ? 'notes' : activeTab} 
          onValueChange={setActiveTab}
          className="flex-1 flex flex-col min-h-full w-full"
        >
          <header className="px-6 py-8 border-b border-border flex flex-col sm:flex-row sm:items-end justify-between gap-6 bg-background/95 backdrop-blur-xl z-10 sticky top-0">
            <div className="flex items-center gap-3">
              {!isADHDMode && (
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="flex h-8 w-8 text-muted-foreground hover:text-foreground mr-1"
                  onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                >
                  <Menu className="h-5 w-5 md:hidden" />
                  <div className="hidden md:block">
                    {isSidebarOpen ? <ChevronRight className="h-4 w-4 rotate-180" /> : <ChevronRight className="h-4 w-4" />}
                  </div>
                </Button>
              )}
              <div>
                <h1 className="text-2xl sm:text-4xl font-semibold tracking-tight text-foreground line-clamp-2">
                  {selectedTopic?.name}
                </h1>
              </div>
            </div>

            <TabsList className="w-full grid grid-cols-4 sm:w-auto sm:flex bg-transparent p-0 gap-2 sm:gap-6 h-auto border-none">
              <TabsTrigger value="notes" className="rounded-none border-b-2 border-transparent data-[state=active]:border-foreground bg-transparent data-[state=active]:bg-transparent data-[state=active]:shadow-none p-0 pb-2 text-muted-foreground data-[state=active]:text-foreground uppercase tracking-widest text-xs font-semibold transition-all">
                Notes
              </TabsTrigger>
              <TabsTrigger value="audio" className="rounded-none border-b-2 border-transparent data-[state=active]:border-foreground bg-transparent data-[state=active]:bg-transparent data-[state=active]:shadow-none p-0 pb-2 text-muted-foreground data-[state=active]:text-foreground uppercase tracking-widest text-xs font-semibold transition-all">
                Audio
              </TabsTrigger>
              <TabsTrigger value="analysis" className="rounded-none border-b-2 border-transparent data-[state=active]:border-foreground bg-transparent data-[state=active]:bg-transparent data-[state=active]:shadow-none p-0 pb-2 text-muted-foreground data-[state=active]:text-foreground uppercase tracking-widest text-xs font-semibold transition-all">
                Analysis
              </TabsTrigger>
              <TabsTrigger value="practice" className="rounded-none border-b-2 border-transparent data-[state=active]:border-foreground bg-transparent data-[state=active]:bg-transparent data-[state=active]:shadow-none p-0 pb-2 text-muted-foreground data-[state=active]:text-foreground uppercase tracking-widest text-xs font-semibold transition-all">
                Practice
              </TabsTrigger>
            </TabsList>
          </header>

          <div className="flex-1 relative p-0 sm:p-0 w-full bg-background min-h-0 overflow-y-auto">
            {isGenerating || selectedTopic?.name.includes("(Processing...)") ? (
              <TabSkeleton activeTab={activeTab === 'mindmap' ? 'notes' : activeTab} />
            ) : error || passPack?.error ? (
              <div className="flex flex-col h-full items-center py-32 px-4 max-w-2xl mx-auto text-center space-y-4">
                <h3 className="text-3xl font-semibold tracking-tight text-foreground">Error</h3>
                <p className="text-muted-foreground text-lg leading-relaxed">
                  {error || passPack?.error}
                </p>
                <Button variant="outline" className="mt-4 rounded" onClick={() => generate(selectedTopic.name)}>
                  Try Again
                </Button>
              </div>
            ) : passPack ? (
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeTab}
                  variants={fadeIn}
                  initial="initial"
                  animate="animate"
                  exit="exit"
                  transition={{ duration: 0.2 }}
                  className="min-h-full w-full"
                >
                  <TabsContent value="notes" className="min-h-full w-full m-0 pb-16 data-[state=active]:flex flex-col">
                    <NotesTab data={passPack.notes} />
                  </TabsContent>
                  
                  <TabsContent value="audio" className="min-h-full w-full m-0 pb-16">
                    <AudioTab data={passPack.audio} topicName={passPack.topic} />
                  </TabsContent>
                  
                  <TabsContent value="analysis" className="min-h-full w-full m-0 pb-16">
                    <AnalysisTab data={passPack.analysis} />
                  </TabsContent>
                  
                  <TabsContent value="practice" className="min-h-full w-full m-0 pb-16">
                    <PracticeTab data={passPack.practice} topicName={selectedTopic?.name} />
                  </TabsContent>
                </motion.div>
              </AnimatePresence>
            ) : null}
          </div>
        </Tabs>
      </main>
    </div>
  );
};

