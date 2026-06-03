import { GoogleGenAI } from "@google/genai";
import Groq from "groq-sdk";

export const models = {
  GROQ_LLAMA: "llama-3.3-70b-versatile",
  GEMINI_FLASH: "gemini-2.5-flash",
};

let genAI: GoogleGenAI | null = null;
let groq: Groq | null = null;

export const callGemini = async (options: any) => {
  if (!genAI) {
    if (!process.env.GEMINI_API_KEY) throw new Error("GEMINI_API_KEY missing");
    genAI = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  }
  return await genAI.models.generateContent({
    model: models.GEMINI_FLASH,
    ...options
  });
};

export const callGeminiTTS = async (text: string) => {
  if (!genAI) {
    if (!process.env.GEMINI_API_KEY) throw new Error("GEMINI_API_KEY missing");
    genAI = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  }
  const interaction = await genAI.interactions.create({
    model: 'gemini-3.1-flash-tts-preview',
    input: `Say the following: ${text}`,
    response_modalities: ['AUDIO'],
    generation_config: {
      speech_config: {
        language: "en-us",
        voice: "kore"
      }
    }
  });

  for (const step of interaction.steps) {
    if (step.type === 'model_output') {
      const audioContent = step.content?.find(c => c.type === 'audio');
      if (audioContent && audioContent.data) {
        return `data:audio/mp3;base64,${audioContent.data}`; // Note: Actually might be different type depending on SDK. The skill says base64 encode.
      }
    }
  }
  throw new Error("TTS generation failed");
};

export const callGroq = async (options: any) => {
  if (!groq) {
    if (!process.env.GROQ_API_KEY) throw new Error("GROQ_API_KEY missing");
    groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
  }
  return await groq.chat.completions.create(options);
};
