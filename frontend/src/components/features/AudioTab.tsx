import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'motion/react';
import { 
  Play, Pause, RotateCcw, RotateCw, Headphones, 
  Volume2, ListMusic, Loader2, FileText
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { cn } from '@/lib/utils';
import { useAccessibilityStore } from '@/store/accessibility';
import { AudioData } from '@/types';
import { fadeIn, springTransition } from '@/lib/animations';
import { useStudyStore } from '@/store/study';

interface AudioTabProps {
  data: AudioData;
  topicName?: string;
}

export const AudioTab = ({ data, topicName }: AudioTabProps) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(600); // Updated dynamically later
  const { isADHDMode } = useAccessibilityStore();
  const [isGenerating, setIsGenerating] = useState(false);
  const [localAudioData, setLocalAudioData] = useState<AudioData>(data);
  const { passPack, setPassPack, setTopicData, topics, selectedTopicId } = useStudyStore();
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  useEffect(() => {
    setLocalAudioData(data);
    if (data.transcript && data.transcript.length > 0) {
      setDuration(Math.max(...data.transcript.map(t => t.time)) + 30); // Rough estimate
    }
  }, [data]);

  const handleGenerateAudio = async () => {
    if (!topicName) return;
    setIsGenerating(true);
    try {
      const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';
      // Generate 15 mins by default
      const response = await fetch(`${API_BASE_URL}/audio/${encodeURIComponent(topicName)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ duration: 15 })
      });
      if (!response.ok) throw new Error('Failed to generate audio');
      const newData = await response.json();
      setLocalAudioData(newData);
      setDuration(Math.max(...newData.transcript.map((t: any) => t.time)) + 30 || 900);
      setCurrentTime(0);

      if (passPack && passPack.topic === topicName) {
        const updatedPassPack = { ...passPack, audio: newData };
        setPassPack(updatedPassPack);
        const topic = topics.find(t => t.name === topicName);
        const topicId = topic?.id || selectedTopicId;
        if (topicId) setTopicData(topicId, updatedPassPack);
      }
    } catch (error) {
      console.error("Audio generation failed:", error);
    } finally {
      setIsGenerating(false);
    }
  };

  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (!audioRef.current && localAudioData.audioUrl) {
      audioRef.current = new Audio(localAudioData.audioUrl);
      
      audioRef.current.onloadedmetadata = () => {
        if (audioRef.current) setDuration(audioRef.current.duration);
      };
      
      audioRef.current.ontimeupdate = () => {
        if (audioRef.current) setCurrentTime(audioRef.current.currentTime);
      };
      
      audioRef.current.onended = () => {
        setIsPlaying(false);
      };
    } else if (audioRef.current && localAudioData.audioUrl && audioRef.current.src !== localAudioData.audioUrl) {
      audioRef.current.src = localAudioData.audioUrl;
      audioRef.current.load();
    }
  }, [localAudioData.audioUrl]);

  useEffect(() => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.play().catch(e => {
          console.error("Audio play failed:", e);
          setIsPlaying(false); // In case of standard browser autoplay policy block
        });
      } else {
        audioRef.current.pause();
      }
    }
  }, [isPlaying]);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.playbackRate = playbackSpeed;
    }
  }, [playbackSpeed]);


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
      <div className="max-w-4xl mx-auto py-32 px-4 text-center space-y-12">
        <div className="space-y-4">
          <h3 className="text-3xl font-semibold tracking-tight text-foreground">Prepare Podcast</h3>
          <p className="text-muted-foreground max-w-lg mx-auto leading-relaxed">
            Generate an AI-hosted podcast outlining the core concepts of this topic to help you understand the material better.
          </p>
        </div>
        <Button size="lg" className="px-8 rounded" onClick={handleGenerateAudio}>
           Generate Podcast
        </Button>
      </div>
    );
  }

  if (isGenerating) {
    return (
      <div className="h-full flex flex-col items-center justify-center gap-4 py-32">
        <Loader2 className="h-8 w-8 animate-spin text-primary opacity-50" />
        <p className="text-muted-foreground font-mono text-sm tracking-wider uppercase">Generating podcast...</p>
      </div>
    );
  }

  return (
    <motion.div 
      variants={fadeIn}
      initial="initial"
      animate="animate"
      className="max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8 space-y-16"
    >
      {/* Main Player */}
      <div className="flex flex-col md:flex-row gap-12 sm:gap-16 items-center md:items-start py-8">
        <div className="flex-1 w-full space-y-12">
          <div className="text-center md:text-left space-y-2">
            <h3 className="text-3xl font-semibold tracking-tight">{localAudioData.title || `Podcast: ${topicName}`}</h3>
            <p className="text-sm font-mono text-muted-foreground tracking-wider uppercase"> AI Audio Session</p>
          </div>

          <div className="w-full space-y-4">
            <Slider 
              value={[currentTime]} 
              max={duration} 
              step={1}
              onValueChange={(val) => {
                setCurrentTime(val[0]);
                if (audioRef.current) audioRef.current.currentTime = val[0];
              }}
              className="cursor-pointer"
            />
            <div className="flex justify-between text-xs font-mono text-muted-foreground font-medium">
              <span>{formatTime(currentTime)}</span>
              <span>{formatTime(duration)}</span>
            </div>
          </div>

          <div className="flex items-center justify-center md:justify-start gap-6">
            <Button variant="ghost" size="icon" onClick={changeSpeed} className="font-mono text-sm hover:bg-transparent text-muted-foreground hover:text-foreground">
              {playbackSpeed}x
            </Button>
            
            <Button variant="ghost" size="icon" className="hover:bg-transparent text-muted-foreground hover:text-foreground" onClick={() => {
              const newTime = Math.max(0, currentTime - 15);
              setCurrentTime(newTime);
              if (audioRef.current) audioRef.current.currentTime = newTime;
            }}>
              <RotateCcw className="h-5 w-5" />
            </Button>

            <Button 
              size="icon" 
              className="h-16 w-16 rounded-full bg-foreground text-background hover:bg-foreground/90 transition-all hover:scale-105" 
              onClick={togglePlay}
            >
              {isPlaying ? <Pause className="h-6 w-6 fill-current" /> : <Play className="h-6 w-6 fill-current ml-1" />}
            </Button>

            <Button variant="ghost" size="icon" className="hover:bg-transparent text-muted-foreground hover:text-foreground" onClick={() => {
              const newTime = Math.min(duration, currentTime + 15);
              setCurrentTime(newTime);
              if (audioRef.current) audioRef.current.currentTime = newTime;
            }}>
              <RotateCw className="h-5 w-5" />
            </Button>

            <Button variant="ghost" size="icon" className="hover:bg-transparent text-muted-foreground hover:text-foreground">
              <Volume2 className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </div>

      {/* Transcript Area */}
      <div className="space-y-6 pt-12 border-t border-border">
        <h3 className="text-xl font-semibold tracking-tight"> Transcript </h3>
        <div className="space-y-6 text-base leading-relaxed text-foreground/80 max-w-3xl">
          {localAudioData.transcript && localAudioData.transcript.length > 0 ? (
            localAudioData.transcript.map((item, index) => (
              <p 
                key={index}
                className={cn(
                  "transition-colors duration-300", 
                  currentTime >= item.time && (index === localAudioData.transcript.length - 1 || currentTime < localAudioData.transcript[index + 1].time)
                    ? "text-foreground font-medium" 
                    : "opacity-50 hover:opacity-100"
                )}
              >
                {item.text}
              </p>
            ))
          ) : (
             <p className="opacity-50 italic">No transcript available.</p>
          )}
        </div>
      </div>
    </motion.div>
  );
};

