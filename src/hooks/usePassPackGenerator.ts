import { useState, useCallback } from 'react';
import { PassPackResponse } from '@/types';

interface AgentThought {
  message: string;
  timestamp: number;
}

export const usePassPackGenerator = () => {
  const [thoughts, setThoughts] = useState<AgentThought[]>([]);
  const [result, setResult] = useState<PassPackResponse | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generate = useCallback(async (topic: string) => {
    setIsGenerating(true);
    setThoughts([{ message: "Retrieving pre-generated study materials...", timestamp: Date.now() }]);
    setResult(null);
    setError(null);

    try {
      const response = await fetch(`/api/topic/${encodeURIComponent(topic)}`);
      
      if (!response.ok) {
        if (response.status === 404) {
          throw new Error("Content is still being generated. Please wait a few moments and try again.");
        }
        throw new Error(`Server error: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.error) {
        throw new Error(data.error);
      }

      setResult(data);
      setThoughts(prev => [...prev, { message: "Content loaded successfully.", timestamp: Date.now() }]);
    } catch (err: any) {
      setError(err.message || "Failed to load content.");
    } finally {
      setIsGenerating(false);
    }
  }, []);

  return { generate, thoughts, result, isGenerating, error };
};
