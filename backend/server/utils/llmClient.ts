import { GoogleGenAI } from "@google/genai";
import Groq from "groq-sdk";
import pLimit from "p-limit";
import retry from "async-retry";
import dotenv from "dotenv";

dotenv.config();

const geminiApiKey = process.env.OCR_GEMINI_API_KEY || process.env.GEMINI_API_KEY;
const groqApiKey = process.env.GROQ_API_KEY;

const genAI = new GoogleGenAI({ apiKey: geminiApiKey || "dummy_key" });
const groq = groqApiKey ? new Groq({ apiKey: groqApiKey }) : null;

// Throttling: Max 1 concurrent LLM call to be extremely safe with free tier
const geminiLimit = pLimit(1);
const groqLimit = pLimit(1); // Reduce Groq concurrency to avoid TPM limits
let lastGeminiCallTime = 0;
let lastGroqCallTime = 0;

async function waitIfNecessary(isGroq: boolean = false) {
  const now = Date.now();
  const lastCallTime = isGroq ? lastGroqCallTime : lastGeminiCallTime;
  // Gemini: 15 RPM -> 4s. Groq: 30 RPM, but strict TPM -> 6s.
  const minInterval = isGroq ? 6000 : 5000; 
  
  const timeSinceLastCall = now - lastCallTime;
  
  if (timeSinceLastCall < minInterval) {
    const waitTime = minInterval - timeSinceLastCall;
    await new Promise(resolve => setTimeout(resolve, waitTime));
  }
  
  if (isGroq) {
    lastGroqCallTime = Date.now();
  } else {
    lastGeminiCallTime = Date.now();
  }
}

export const models = {
  GEMINI: "gemini-3-flash-preview",
  GEMINI_FALLBACK: "gemini-flash-latest",
  GROQ_LLAMA: "llama-3.3-70b-versatile"
};

export async function callGemini(params: any, modelName: string = models.GEMINI) {
  let currentModel = modelName;
  
  return geminiLimit(async () => {
    await waitIfNecessary(false);
    return retry(
      async (bail, attempt) => {
        try {
          // Switch to fallback model after 3 failed attempts
          if (attempt > 3 && currentModel === models.GEMINI) {
            console.log(`Switching to fallback model ${models.GEMINI_FALLBACK} due to persistent rate limits.`);
            currentModel = models.GEMINI_FALLBACK;
          }

          const result = await genAI.models.generateContent({
            model: currentModel,
            ...params
          });
          return result;
        } catch (error: any) {
          // Check for rate limit (429) or service unavailable (503)
          if (error.status === 429 || error.code === 429 || error.status === 503 || error.code === 503) {
            
            // Try to extract retry delay from Gemini error details
            let retryDelay = 0;
            if (error.details) {
              const retryInfo = error.details.find((d: any) => d['@type']?.includes('RetryInfo'));
              if (retryInfo && retryInfo.retryDelay) {
                const seconds = parseFloat(retryInfo.retryDelay.replace('s', ''));
                if (!isNaN(seconds)) {
                  retryDelay = seconds * 1000;
                }
              }
            }
            
            if (retryDelay > 0) {
              console.log(`Gemini API rate limited. Server requested wait of ${retryDelay/1000}s. Waiting...`);
              await new Promise(resolve => setTimeout(resolve, retryDelay + 5000)); // Add 5s buffer
            }

            throw error; // Trigger retry
          }
          
          if (error.status === 400 && error.message?.includes("API key")) {
            console.error("CRITICAL: Gemini API Key issue detected:", error.message);
          }
          
          bail(error);
        }
      },
      {
        retries: 10, // More retries
        minTimeout: 5000,
        maxTimeout: 60000,
        factor: 1.5,
        onRetry: (err, attempt) => {
          console.warn(`Gemini Retry Attempt ${attempt} due to rate limit. Next try in a few seconds...`);
        }
      }
    );
  });
}

export async function callGroq(params: any, modelName: string = models.GROQ_LLAMA) {
  if (!groq) {
    console.warn("Groq API key missing, falling back to Gemini");
    return callGemini(params);
  }

  return groqLimit(async () => {
    await waitIfNecessary(true);
    return retry(
      async (bail) => {
        try {
          const completion = await groq.chat.completions.create({
            model: modelName,
            ...params
          });
          return completion;
        } catch (error: any) {
          if (error.status === 429 || error.status === 503) {
            console.log(`Groq API rate limited or unavailable. Retrying...`);
            throw error;
          }
          bail(error);
        }
      },
      {
        retries: 5,
        minTimeout: 5000,
        maxTimeout: 20000,
        factor: 2
      }
    );
  });
}
