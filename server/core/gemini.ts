import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';
import { ChatGoogleGenerativeAI } from '@langchain/google-genai';

dotenv.config();

export const CONFIG = {
  PORT: process.env.PORT || 3000,
  GEMINI_API_KEY: process.env.GEMINI_API_KEY || process.env.OCR_GEMINI_API_KEY || "",
  GROQ_API_KEY: process.env.GROQ_API_KEY || "", // Optional if using Gemini as fallback
};

// Initialize Gemini SDK (for direct calls like Vision)
export const genAI = new GoogleGenAI({ apiKey: CONFIG.GEMINI_API_KEY });

// Initialize LangChain Model (for RAG/Agents)
export const llm = new ChatGoogleGenerativeAI({
  model: "gemini-3-flash-preview",
  apiKey: CONFIG.GEMINI_API_KEY,
  temperature: 0.7,
});

// Initialize Embeddings Model
// We will use a simple placeholder or Gemini embeddings if available
import { GoogleGenerativeAIEmbeddings } from "@langchain/google-genai";
export const embeddings = new GoogleGenerativeAIEmbeddings({
  modelName: "embedding-001", // or text-embedding-004
  apiKey: CONFIG.GEMINI_API_KEY,
});
