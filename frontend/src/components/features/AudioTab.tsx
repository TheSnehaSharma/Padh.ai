import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Play, 
  Pause, 
  RotateCcw, 
  RotateCw, 
  Headphones, 
  Clock, 
  Volume2, 
  ListMusic, 
  Loader2, 
  FastForward,
  FileText
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useAccessibilityStore } from '@/store/accessibility';
import { AudioData } from '@/types';
import { fadeIn, slideUp, springTransition } from '@/lib/animations';
import { useStudyStore } from '@/store/study';

interface AudioTabProps {
  data: AudioData;
  topicName?: string;
}

export const AudioTab = ({ data, topicName }: AudioTabProps) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(600); // 10 minutes default
  const [selectedMode, setSelectedMode] = useState<number | null>(null);
  const { isADHDMode } = useAccessibilityStore();
  const [isGenerating, setIsGenerating] = useState(false);
  const [localAudioData, setLocalAudioData] = useState<AudioData>(data);
  const { passPack, setPassPack, setTopicData, topics, selectedTopicId } = useStudyStore();

  // Update local data when props change
  useEffect(() => {
    setLocalAudioData(data);
  }, [data]);

  const handleGenerateAudio = async (minutes: number) => {
    if (!topicName) return;
    
    setIsGenerating(true);
    setSelectedMode(minutes);
    
    try {
      const response = await fetch('/api/generate-audio', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic: topicName, duration: minutes })
      });
      
      if (!response.ok) throw new Error('Failed to generate audio');
      
      const newData = await response.json();
      setLocalAudioData(newData);
      setDuration(minutes * 60);
      setCurrentTime(0);

      // Update store
      if (passPack && passPack.topic === topicName) {
        const updatedPassPack = { ...passPack, audio: newData };
        setPassPack(updatedPassPack);
        
        // Update cache
        const topic = topics.find(t => t.name === topicName);
        const topicId = topic?.id || selectedTopicId;
        if (topicId) {
          setTopicData(topicId, updatedPassPack);
        }
      }

    } catch (error) {
      console.error("Audio generation failed:", error);
    } finally {
      setIsGenerating(false);
    }
  };

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isPlaying) {
      interval = setInterval(() => {
        setCurrentTime((prev) => {
          if (prev >= duration) {
            setIsPlaying(false);
            return prev;
          }
          return prev + 1;
        });
      }, 1000 / playbackSpeed);
    }
    return () => clearInterval(interval);
  }, [isPlaying, duration, playbackSpeed]);

  const handleModeSelect = (minutes: number) => {
    if (localAudioData.transcript.length === 0) {
        handleGenerateAudio(minutes);
    } else {
        setSelectedMode(minutes);
        setDuration(minutes * 60);
        setCurrentTime(0);
        setIsPlaying(false);
    }
  };

  const togglePlay = () => setIsPlaying(!isPlaying);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const speeds = [1, 1.25, 1.5, 2];
  const changeSpeed = () => {
    const currentIndex = speeds.indexOf(playbackSpeed);
    const nextIndex = (currentIndex + 1) % speeds.length;
    setPlaybackSpeed(speeds[nextIndex]);
  };

  if (localAudioData.transcript.length === 0 && !isGenerating) {
    return (
      <div className="h-full flex flex-col items-center justify-center gap-8 p-6 text-center">
        <div className="p-6 bg-primary/10 rounded-full">
          <Headphones className="h-12 w-12 text-primary" />
        </div>
        <div className="space-y-2 max-w-md">
          <h3 className="text-2xl font-bold">Generate Audio Podcast</h3>
          <p className="text-muted-foreground">
            Select a duration to generate an AI-hosted podcast about this topic based on your notes.
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 w-full max-w-2xl">
          {[
            { min: 10, title: "Crash Course", desc: "High Yield" },
            { min: 30, title: "Core Concepts", desc: "Standard" },
            { min: 60, title: "Deep Dive", desc: "Comprehensive" }
          ].map((mode) => (
            <button
              key={mode.min}
              onClick={() => handleGenerateAudio(mode.min)}
              className="group flex flex-col items-center justify-center p-6 rounded-2xl border border-glass-border bg-glass hover:bg-primary/5 hover:border-primary/50 transition-all duration-300"
            >
              <span className="text-3xl font-bold mb-2 text-primary">
                {mode.min} <span className="text-sm font-normal text-muted-foreground">min</span>
              </span>
              <span className="text-sm font-medium uppercase tracking-wider text-muted-foreground group-hover:text-primary transition-colors">
                {mode.title}
              </span>
            </button>
          ))}
        </div>
      </div>
    );
  }

  if (isGenerating) {
    return (
      <div className="h-full flex flex-col items-center justify-center gap-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-muted-foreground animate-pulse">Generating your podcast...</p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col gap-8 p-1">
      {/* Duration Selection */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { min: 10, title: "Crash Course", desc: "High Yield" },
          { min: 30, title: "Core Concepts", desc: "Standard" },
          { min: 60, title: "Deep Dive", desc: "Comprehensive" }
        ].map((mode) => (
          <button
            key={mode.min}
            onClick={() => handleModeSelect(mode.min)}
            className={cn(
              "relative group flex flex-col items-center justify-center p-4 rounded-2xl border transition-all duration-300",
              selectedMode === mode.min
                ? "bg-primary/10 border-primary shadow-lg shadow-primary/10 scale-[1.02]"
                : "bg-glass backdrop-blur-xl border-glass-border shadow-sm shadow-glass-shadow hover:bg-background/90 hover:border-primary/30"
            )}
          >
            <span className={cn(
              "text-2xl font-bold mb-1",
              selectedMode === mode.min ? "text-primary" : "text-foreground"
            )}>
              {mode.min} <span className="text-sm font-normal text-muted-foreground">min</span>
            </span>
            <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              {mode.title}
            </span>
            {selectedMode === mode.min && (
              <motion.div
                layoutId="active-pill"
                className="absolute inset-0 border-2 border-primary rounded-2xl"
                transition={springTransition}
              />
            )}
          </button>
        ))}
      </div>

      {/* Main Player */}
      <Card className="overflow-hidden border-glass-border bg-glass backdrop-blur-xl shadow-xl flex flex-col md:flex-row min-h-[400px]">
        {/* Left: Player Controls */}
        <div className="flex-1 p-6 sm:p-8 flex flex-col justify-center items-center space-y-6 sm:space-y-8 border-b md:border-b-0 md:border-r border-glass-border">
          <div className="relative">
            <div className="h-32 w-32 sm:h-48 sm:w-48 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center shadow-2xl ring-1 ring-white/10">
              <Headphones className="h-12 w-12 sm:h-20 sm:w-20 text-primary opacity-80" />
            </div>
            {isPlaying && (
              <div className="absolute inset-0 rounded-full border-2 border-primary/30 animate-ping" />
            )}
          </div>

          <div className="text-center space-y-1 sm:space-y-2">
            <h3 className="text-xl sm:text-2xl font-bold tracking-tight">{localAudioData.title}</h3>
            <p className="text-xs sm:text-sm text-muted-foreground font-medium">Chapter 4 • {selectedMode} Min Session</p>
          </div>

          <div className="w-full max-w-md space-y-3 sm:space-y-4">
            <div className="flex justify-between text-[10px] sm:text-xs font-mono text-muted-foreground">
              <span>{formatTime(currentTime)}</span>
              <span>{formatTime(duration)}</span>
            </div>
            <Slider 
              value={[currentTime]} 
              max={duration} 
              step={1}
              onValueChange={(val) => setCurrentTime(val[0])}
              className="cursor-pointer"
            />
          </div>

          <div className="flex items-center gap-4 sm:gap-6">
            <Button variant="ghost" size="icon" onClick={changeSpeed} className="text-[10px] sm:text-xs font-bold h-8 w-8 sm:h-10 sm:w-10 rounded-full hover:bg-primary/10">
              {playbackSpeed}x
            </Button>
            
            <Button variant="outline" size="icon" className="h-10 w-10 sm:h-12 sm:w-12 rounded-full border-glass-border hover:bg-background/10" onClick={() => setCurrentTime(Math.max(0, currentTime - 15))}>
              <RotateCcw className="h-4 w-4 sm:h-5 sm:w-5" />
            </Button>

            <Button 
              size="icon" 
              className="h-12 w-12 sm:h-16 sm:w-16 rounded-full shadow-2xl bg-primary hover:bg-primary/90 hover:scale-105 transition-all" 
              onClick={togglePlay}
            >
              {isPlaying ? <Pause className="h-6 w-6 sm:h-8 sm:w-8 fill-current" /> : <Play className="h-6 w-6 sm:h-8 sm:w-8 fill-current ml-1" />}
            </Button>

            <Button variant="outline" size="icon" className="h-10 w-10 sm:h-12 sm:w-12 rounded-full border-glass-border hover:bg-background/10" onClick={() => setCurrentTime(Math.min(duration, currentTime + 15))}>
              <RotateCw className="h-4 w-4 sm:h-5 sm:w-5" />
            </Button>

            <Button variant="ghost" size="icon" className="h-8 w-8 sm:h-10 sm:w-10 rounded-full hover:bg-primary/10">
              <Volume2 className="h-4 w-4 sm:h-5 sm:w-5" />
            </Button>
          </div>
        </div>

        {/* Right: Playlist */}
        <div className="w-full md:w-80 bg-background/50 p-6 flex flex-col">
          <div className="flex items-center gap-2 mb-6 text-muted-foreground">
            <ListMusic className="h-4 w-4" />
            <span className="text-xs font-bold uppercase tracking-wider">Chapters</span>
          </div>
          
          <div className="space-y-2 overflow-y-auto pr-2 custom-scrollbar flex-1">
            {localAudioData.chapters.map((topic) => (
              <button
                key={topic.id}
                className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-background/10 transition-colors text-left group"
              >
                <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0 group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                  <Play className="h-3 w-3 fill-current ml-0.5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{topic.title}</p>
                  <p className="text-xs text-muted-foreground">{topic.duration}</p>
                </div>
              </button>
            ))}
          </div>
        </div>
      </Card>

      {/* Transcript Area */}
      <Card className="border-glass-border bg-background shadow-lg overflow-hidden">
        <div className="p-4 sm:p-6 border-b border-glass-border bg-primary/5 flex items-center justify-between">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            Live Transcript
          </h3>
          <Badge variant="outline" className="text-[10px] font-mono">
            Auto-Generated
          </Badge>
        </div>
        <CardContent className="p-4 sm:p-6 bg-background">
          <div className="space-y-4 text-sm leading-relaxed text-muted-foreground">
            {localAudioData.transcript && localAudioData.transcript.length > 0 ? (
              localAudioData.transcript.map((item, index) => (
                <p 
                  key={index}
                  className={cn(
                    "transition-colors duration-300", 
                    currentTime >= item.time && (index === localAudioData.transcript.length - 1 || currentTime < localAudioData.transcript[index + 1].time)
                      ? "text-foreground font-medium" 
                      : "opacity-50"
                  )}
                >
                  [{Math.floor(item.time / 60).toString().padStart(2, '0')}:{(item.time % 60).toString().padStart(2, '0')}] {item.text}
                </p>
              ))
            ) : (
               <p className="opacity-50 italic">No transcript available.</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

