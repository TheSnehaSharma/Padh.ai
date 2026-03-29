import { Topic, NotesData, AudioData, PracticeQuestion, TopicAnalysis, PassPackResponse } from '../types';

const API_BASE_URL = process.env.PUBLIC_API_URL || '/api';

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Simple in-memory cache
const cache: Record<string, any> = {};

const getCachedData = async <T>(key: string, fetcher: () => Promise<T>): Promise<T> => {
  if (cache[key]) return cache[key];
  const data = await fetcher();
  cache[key] = data;
  return data;
};

const fetchWithRetry = async (url: string, options: RequestInit = {}, retries = 3): Promise<Response> => {
  for (let i = 0; i < retries; i++) {
    try {
      const response = await fetch(url, options);
      
      // If we get the "Starting Server" HTML, it means the backend is still booting
      if (response.ok) {
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('text/html')) {
          const text = await response.clone().text();
          if (text.includes('Starting Server') || text.includes('Please wait while your application starts')) {
            console.warn(`Hit "Starting Server" page (attempt ${i + 1}/${retries}). Retrying in 3s...`);
            await sleep(3000);
            continue;
          }
        }
      }
      
      return response;
    } catch (error) {
      if (i === retries - 1) throw error;
      console.warn(`Fetch failed (attempt ${i + 1}/${retries}). Retrying in 3s...`, error);
      await sleep(3000);
    }
  }
  throw new Error('Max retries reached');
};

export const uploadPDFs = async (files: File[], categories: string[]) => {
  const formData = new FormData();
  files.forEach((file) => {
    formData.append('file', file);
  });

  // If we upload multiple, we might need to loop.
  
  let lastResult = null;
  for (let i = 0; i < files.length; i++) {
    const formData = new FormData();
    formData.append('file', files[i]);
    formData.append('category', categories[i]);
    
    const response = await fetchWithRetry(`${API_BASE_URL}/upload`, {
      method: 'POST',
      body: formData,
      credentials: 'include',
    });
    
    if (!response.ok) {
      if (response.status === 413) {
        throw new Error(`File "${files[i].name}" is too large. The network proxy has a strict limit (usually ~10-20MB). Please compress it or split it.`);
      }

      let errorMessage = `Failed to upload ${files[i].name} (Status: ${response.status})`;
      try {
        const text = await response.text();
        try {
          const errorData = JSON.parse(text);
          if (errorData.error) {
            errorMessage = errorData.error;
          } else {
            errorMessage += `: ${text.substring(0, 100)}`;
          }
        } catch {
          errorMessage += `: ${text.substring(0, 100)}`;
        }
      } catch (e) {

      }
      throw new Error(errorMessage);
    }
    
    try {
      const text = await response.text();
      try {
        lastResult = JSON.parse(text);
      } catch (e) {
        console.error("Failed to parse JSON response. Raw text:", text.substring(0, 500));
        
        let errorMsg = `Server returned invalid JSON for ${files[i].name}.`;
        if (text.includes("<!doctype html>") || text.includes("<html")) {
          if (text.includes("Cookie check") || text.includes("cookie")) {
             errorMsg += " The request was blocked by the network (Cookie check). This happens if third-party cookies are blocked in your browser or if the file is too large for the proxy (try < 15MB).";
          } else {
             errorMsg += " The server returned an HTML page instead of JSON. This might be due to a proxy size limit or a session issue.";
          }
        } else {
          errorMsg += ` Raw response starts with: ${text.substring(0, 50)}`;
        }
        throw new Error(errorMsg);
      }
    } catch (e: any) {
      console.error("Failed to read/parse response:", e);
      throw new Error(`Upload failed for ${files[i].name}: ${e.message}`);
    }
  }
  return lastResult;
};

export const fetchTopics = async (): Promise<Topic[]> => {
  const response = await fetchWithRetry(`${API_BASE_URL}/topics`);
  if (!response.ok) {
    throw new Error('Failed to fetch topics');
  }
  return await response.json();
};

export const generatePassPack = async (topic: string): Promise<PassPackResponse> => {
  const response = await fetchWithRetry(`${API_BASE_URL}/topic/${encodeURIComponent(topic)}`);

  if (!response.ok) {
    if (response.status === 404) {
      throw new Error('Content is still being generated. Please wait a few moments.');
    }
    throw new Error('Failed to fetch topic content');
  }

  return await response.json();
};

export const askAssistant = async (query: string, context: string) => {
  const response = await fetchWithRetry(`${API_BASE_URL}/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, context }),
  });

  if (!response.ok) {
    throw new Error('Failed to get response from assistant');
  }

  return await response.json();
};

export const getNotesData = async (topicId: string): Promise<NotesData> => {
  const topics = await fetchTopics();
  const topic = topics.find(t => t.id === topicId);
  if (topic) {
     try {
       const data = await generatePassPack(topic.name);
       return data.notes;
     } catch (e) {
       console.error("Failed to fetch notes from backend", e);
     }
  }
  
  return {
    content: "# Error\nCould not fetch notes.",
    sources: [],
    isAiGenerated: false
  };
};

export const getAudioData = async (topicId: string): Promise<AudioData> => {
  const topics = await fetchTopics();
  const topic = topics.find(t => t.id === topicId);
  if (topic) {
     try {
       const data = await generatePassPack(topic.name);
       return data.audio;
     } catch (e) {
       console.error("Failed to fetch audio from backend", e);
     }
  }
  return { id: topicId, title: "Error", chapters: [], transcript: [] };
};

export const getPracticeQuestions = async (topicId: string): Promise<PracticeQuestion[]> => {
  const topics = await fetchTopics();
  const topic = topics.find(t => t.id === topicId);
  if (topic) {
     try {
       const data = await generatePassPack(topic.name);
       return data.practice;
     } catch (e) {
       console.error("Failed to fetch practice questions from backend", e);
     }
  }
  return [];
};

export const getTopicAnalysis = async (topicId: string): Promise<TopicAnalysis> => {
  const topics = await fetchTopics();
  const topic = topics.find(t => t.id === topicId);
  if (topic) {
     try {
       const data = await generatePassPack(topic.name);
       return data.analysis;
     } catch (e) {
       console.error("Failed to fetch topic analysis from backend", e);
     }
  }
  return {
    totalQuestions: "0",
    yearsAppeared: "0",
    avgMarks: "0",
    subtopicDistribution: [],
    mostAskedQuestions: []
  };
};
