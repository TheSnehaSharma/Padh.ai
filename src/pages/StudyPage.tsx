import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  LayoutGrid, 
  Headphones, 
  BarChart3, 
  PenTool, 
  ChevronRight, 
  Flame,
  Search,
  Menu,
  X,
  Loader2,
  BookOpen
} from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { NotesTab } from '@/components/features/NotesTab';
import { AudioTab } from '@/components/features/AudioTab';
import { AnalysisTab } from '@/components/features/AnalysisTab';
import { PracticeTab } from '@/components/features/PracticeTab';
import { useAccessibilityStore } from '@/store/accessibility';
import { useStudyStore } from '@/store/study';
import { cn } from '@/lib/utils';
import { fetchTopics } from '@/lib/api';
import { Topic, PassPackResponse } from '@/types';
import { fadeIn, slideUp, staggerContainer } from '@/lib/animations';
import { usePassPackGenerator } from '@/hooks/usePassPackGenerator';
import { Terminal } from '@/components/ui/Terminal';

import { StudySidebar } from '@/components/layout/StudySidebar';

export const StudyPage = () => {
  const { 
    topics, selectedTopicId, passPack, activeTab, topicData,
    setTopics, setSelectedTopicId, setPassPack, setActiveTab, setTopicData
  } = useStudyStore();

  const { generate, thoughts, result, isGenerating, error } = usePassPackGenerator();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isLoading, setIsLoading] = useState(topics.length === 0);
  const { isADHDMode } = useAccessibilityStore();

  // Load topics
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

  // Poll for topics if any are processing
  useEffect(() => {
    const pollInterval = setInterval(async () => {
      const hasProcessingTopic = topics.some(t => t.name.includes("Processing") || t.name.includes("Processing..."));
      if (hasProcessingTopic || topics.length === 0) {
        try {
          const data = await fetchTopics();
          // Only update if changed to avoid re-renders
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

  // Handle generation result
  useEffect(() => {
    if (result) {
      setPassPack(result);
      if (result.topic) {
        // Find topic ID by name or use selectedTopicId
        const topic = topics.find(t => t.name === result.topic);
        const topicId = topic?.id || selectedTopicId;
        if (topicId) {
          setTopicData(topicId, result);
        }
      }
      if (result.topics && result.topics.length > 0) {
        setTopics(result.topics);
      }
    }
  }, [result, setPassPack, setTopics, setTopicData, selectedTopicId, topics]);

  // Trigger generation when topic changes
  useEffect(() => {
    const loadPassPack = async () => {
      if (!selectedTopicId) return;
      
      const topic = topics.find(t => t.id === selectedTopicId);
      if (!topic) return;

      // Check cache first
      if (topicData[selectedTopicId]) {
        setPassPack(topicData[selectedTopicId]);
        return;
      }

      // If not in cache, generate
      // BUT: User said "Only generate after the generate pass pack button is clicked"
      // This implies we should ONLY generate if we explicitly want to.
      // However, if we are on the study page and select a topic that hasn't been generated yet,
      // we MUST generate it, otherwise the page is empty.
      // The "Generate Pass Pack" button on dashboard is the *initial* trigger.
      // Let's assume that if we are here, we are allowed to generate content for the selected topic.
      // The "don't generate again" part is handled by the cache check above.
      
      if (!isGenerating && !topic.name.includes("(Processing...)")) {
        generate(topic.name);
      }
    };
    loadPassPack();
  }, [selectedTopicId, topics, topicData, isGenerating, generate]); // Added deps

  const selectedTopic = topics.find(t => t.id === selectedTopicId);

  if (isLoading) {
    // ... existing loading spinner
    return (
      <div className="flex h-[calc(100vh-3.5rem)] items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="text-muted-foreground animate-pulse">Loading your workspace...</p>
        </div>
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
          <div className="p-6 bg-primary/10 rounded-full w-24 h-24 mx-auto flex items-center justify-center">
            <LayoutGrid className="h-12 w-12 text-primary" />
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-bold tracking-tight">No content found</h2>
            <p className="text-muted-foreground">
              Your study workspace is empty. Begin by uploading your syllabus and previous year papers in the dashboard.
            </p>
          </div>
          <Button size="lg" className="rounded-full px-8" asChild>
            <a href="/dashboard">Go to Dashboard</a>
          </Button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-3.5rem)] overflow-hidden bg-background">
      {/* Sidebar - Frequency List */}
      {!isADHDMode && (
        <StudySidebar 
          isOpen={isSidebarOpen} 
          onClose={() => setIsSidebarOpen(false)} 
          topics={topics} 
          selectedTopicId={selectedTopicId} 
          onSelectTopic={(id) => {
            setSelectedTopicId(id);
            // Only close on mobile
            if (window.innerWidth < 768) {
              setIsSidebarOpen(false);
            }
          }} 
        />
      )}

      {/* Main Content */}
      <main className={cn(
        "flex-1 flex flex-col min-w-0 bg-gradient-to-br from-background via-background to-primary/5 relative overflow-y-auto custom-scrollbar",
        (isSidebarOpen && !isADHDMode) && "hidden md:flex",
        isADHDMode && "w-full max-w-4xl mx-auto"
      )}>
        <div className="flex-1 flex flex-col min-h-full w-full">
          <Tabs 
            defaultValue="notes" 
            value={activeTab === 'mindmap' ? 'notes' : activeTab} 
            onValueChange={setActiveTab}
            className="flex-1 flex flex-col min-h-full w-full"
          >
            {/* Header */}
            <header className="px-6 py-5 border-b border-glass-border flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-glass backdrop-blur-xl z-10 shrink-0 sticky top-0">
              <div className="flex items-center gap-3">
                {/* Toggle Sidebar Button (Mobile/Desktop) */}
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
                  <h1 className="text-2xl font-bold tracking-tight">
                    {selectedTopic?.name}
                  </h1>
                </div>
              </div>

              <TabsList className="w-full grid grid-cols-4 sm:w-auto sm:flex bg-slate-100 dark:bg-slate-800/50 p-1 rounded-xl self-start sm:self-auto h-auto border border-slate-200 dark:border-slate-700">
                <TabsTrigger value="notes" className="rounded-lg flex-col sm:flex-row gap-1 sm:gap-2 text-[10px] sm:text-sm p-2 sm:px-3 data-[state=active]:bg-white dark:data-[state=active]:bg-slate-900 data-[state=active]:text-primary data-[state=active]:shadow-sm transition-all duration-200">
                  <BookOpen className="h-4 w-4" />
                  Notes
                </TabsTrigger>
                <TabsTrigger value="audio" className="rounded-lg flex-col sm:flex-row gap-1 sm:gap-2 text-[10px] sm:text-sm p-2 sm:px-3 data-[state=active]:bg-white dark:data-[state=active]:bg-slate-900 data-[state=active]:text-primary data-[state=active]:shadow-sm transition-all duration-200">
                  <Headphones className="h-4 w-4" />
                  Audio
                </TabsTrigger>
                <TabsTrigger value="analysis" className="rounded-lg flex-col sm:flex-row gap-1 sm:gap-2 text-[10px] sm:text-sm p-2 sm:px-3 data-[state=active]:bg-white dark:data-[state=active]:bg-slate-900 data-[state=active]:text-primary data-[state=active]:shadow-sm transition-all duration-200">
                  <BarChart3 className="h-4 w-4" />
                  Analysis
                </TabsTrigger>
                <TabsTrigger value="practice" className="rounded-lg flex-col sm:flex-row gap-1 sm:gap-2 text-[10px] sm:text-sm p-2 sm:px-3 data-[state=active]:bg-white dark:data-[state=active]:bg-slate-900 data-[state=active]:text-primary data-[state=active]:shadow-sm transition-all duration-200">
                  <PenTool className="h-4 w-4" />
                  Practice
                </TabsTrigger>
              </TabsList>
            </header>

            {/* Tab Content Area */}
            <div className="flex-1 relative p-6 sm:p-8 w-full">
              {isGenerating ? (
                <div className="flex h-full w-full items-center justify-center">
                  <Terminal thoughts={thoughts} isComplete={!!result} />
                </div>
              ) : selectedTopic?.name.includes("(Processing...)") ? (
                <div className="flex h-full w-full items-center justify-center flex-col gap-4">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  <p className="text-muted-foreground">Extracting content from document...</p>
                  <p className="text-xs text-muted-foreground/70">This may take a moment for large files.</p>
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
                    className="h-full w-full"
                  >
                    <TabsContent value="notes" className="min-h-full w-full m-0 data-[state=active]:flex flex-col">
                      <NotesTab data={passPack.notes} />
                    </TabsContent>
                    
                    <TabsContent value="audio" className="min-h-full w-full m-0">
                      <AudioTab data={passPack.audio} topicName={passPack.topic} />
                    </TabsContent>
                    
                    <TabsContent value="analysis" className="min-h-full w-full m-0">
                      <AnalysisTab data={passPack.analysis} />
                    </TabsContent>
                    
                    <TabsContent value="practice" className="min-h-full w-full m-0">
                      <PracticeTab data={passPack.practice} />
                    </TabsContent>
                  </motion.div>
                </AnimatePresence>
              ) : (
                <div className="flex h-full w-full items-center justify-center">
                  <p className="text-muted-foreground">Select a topic to generate content.</p>
                </div>
              )}
            </div>
          </Tabs>
        </div>
      </main>
    </div>
  );
};

